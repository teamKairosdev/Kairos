import { randomUUID } from 'node:crypto';
import { hashValue } from '@/server/harness';
import { getSandboxConfig } from './config';
import {
  createSandboxBackend,
  SandboxBackendError,
} from './backend';
import type {
  SandboxBackend,
  SandboxBackendFactory,
  SandboxBackendResult,
  SandboxBackendStatus,
  SandboxCapabilities,
  SandboxJob,
  SandboxJobRequest,
} from './types';

export type SandboxJobSubmissionRequest = SandboxJobRequest & {
  toolActionHash: string;
};

export type PublicSandboxJob = Omit<SandboxJob, 'input' | 'result'> & {
  inputHash: string;
  resultAvailable: boolean;
};

export interface SandboxJobDetails {
  job: PublicSandboxJob;
  result: SandboxJob['result'];
}

const jobs = new Map<string, SandboxJob>();
const controllers = new Map<string, AbortController>();
const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

function publicJob(job: SandboxJob): PublicSandboxJob {
  const { input, result, ...safeJob } = job;
  return {
    ...safeJob,
    inputHash: hashValue(input),
    resultAvailable: Boolean(result),
  };
}

function cloneResult(result: SandboxJob['result']): SandboxJob['result'] {
  if (!result) return null;
  return { ...result };
}

function cloneJob(job: SandboxJob): SandboxJob {
  return {
    ...job,
    networkPolicy: {
      mode: job.networkPolicy.mode,
      allowedHosts: [...job.networkPolicy.allowedHosts],
    },
    result: cloneResult(job.result),
  };
}

function outputByteLength(value: unknown): number {
  const text = typeof value === 'string' ? value : JSON.stringify(value) ?? 'null';
  return new TextEncoder().encode(text).byteLength;
}

function errorCode(error: unknown): string {
  if (error instanceof SandboxBackendError) return error.code;
  if (error instanceof Error && error.name === 'AbortError') return 'SANDBOX_JOB_CANCELLED';
  return 'SANDBOX_BACKEND_FAILED';
}

function errorMessage(error: unknown): string {
  if (error instanceof SandboxBackendError) return error.message;
  return 'sandbox backend가 job을 완료하지 못했습니다.';
}

function isActiveStatus(status: SandboxJob['status']): boolean {
  return status === 'queued' || status === 'running';
}

function setExpired(job: SandboxJob, code: string, message: string): void {
  if (!isActiveStatus(job.status)) return;
  job.status = 'expired';
  job.errorCode = code;
  job.errorMessage = message;
  job.completedAt = new Date();
  controllers.get(job.id)?.abort();
}

export class SandboxControlPlane {
  constructor(private readonly backendFactory: SandboxBackendFactory = () => createSandboxBackend(getSandboxConfig())) {}

  getBackend(): SandboxBackend {
    return this.backendFactory();
  }

  getStatus(): SandboxBackendStatus {
    return this.getBackend().getStatus();
  }

  getCapabilities(): SandboxCapabilities {
    return this.getBackend().getCapabilities();
  }

  listJobs(userId: string): PublicSandboxJob[] {
    return Array.from(jobs.values())
      .filter((job) => job.userId === userId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 100)
      .map(publicJob);
  }

  getJob(userId: string, jobId: string): PublicSandboxJob | null {
    const job = jobs.get(jobId);
    if (!job || job.userId !== userId) return null;
    return publicJob(job);
  }

  getJobDetails(userId: string, jobId: string): SandboxJobDetails | null {
    const job = jobs.get(jobId);
    if (!job || job.userId !== userId) return null;
    return { job: publicJob(job), result: cloneResult(job.result) };
  }

  async submit(request: SandboxJobSubmissionRequest): Promise<PublicSandboxJob> {
    const backend = this.getBackend();
    const backendStatus = backend.getStatus();
    const now = new Date();
    const job: SandboxJob = {
      ...request,
      id: randomUUID(),
      backend: backendStatus.backend,
      toolActionHash: request.toolActionHash,
      status: backendStatus.availability === 'available' && backendStatus.execution === 'remote-adapter'
        ? 'queued'
        : 'disabled',
      result: null,
      remoteJobId: null,
      errorCode: backendStatus.availability === 'available' ? null : backendStatus.code,
      errorMessage: backendStatus.availability === 'available' ? null : backendStatus.reason,
      createdAt: now,
      startedAt: null,
      completedAt: backendStatus.availability === 'available' ? null : now,
    };
    jobs.set(job.id, job);

    if (job.status === 'disabled') return publicJob(job);

    const controller = new AbortController();
    controllers.set(job.id, controller);
    this.scheduleExpiry(job, backend, controller);
    void this.dispatch(job.id, backend, controller);
    return publicJob(job);
  }

  async cancel(userId: string, jobId: string): Promise<PublicSandboxJob | null> {
    const job = jobs.get(jobId);
    if (!job || job.userId !== userId) return null;
    if (!isActiveStatus(job.status)) return publicJob(job);

    const backend = this.getBackend();
    const snapshot = cloneJob(job);
    setExpired(job, 'SANDBOX_JOB_CANCELLED', '사용자가 sandbox job을 취소했습니다.');
    this.clearExpiry(jobId);
    controllers.delete(jobId);
    try {
      await backend.cancel(snapshot);
    } catch {
      // The local lifecycle remains expired even if the remote cancel request fails.
    }
    return publicJob(job);
  }

  clear(): void {
    for (const timer of expiryTimers.values()) clearTimeout(timer);
    expiryTimers.clear();
    for (const controller of controllers.values()) controller.abort();
    controllers.clear();
    jobs.clear();
  }

  private scheduleExpiry(job: SandboxJob, backend: SandboxBackend, controller: AbortController): void {
    const timer = setTimeout(() => {
      const current = jobs.get(job.id);
      if (!current || !isActiveStatus(current.status)) return;
      setExpired(current, 'SANDBOX_TIMEOUT', 'sandbox job 시간이 초과되었습니다.');
      void backend.cancel(cloneJob(current)).catch(() => undefined);
      controllers.delete(job.id);
      expiryTimers.delete(job.id);
      controller.abort();
    }, job.timeoutMs + 50);
    timer.unref?.();
    expiryTimers.set(job.id, timer);
  }

  private clearExpiry(jobId: string): void {
    const timer = expiryTimers.get(jobId);
    if (timer) clearTimeout(timer);
    expiryTimers.delete(jobId);
  }

  private async dispatch(jobId: string, backend: SandboxBackend, controller: AbortController): Promise<void> {
    const job = jobs.get(jobId);
    if (!job || job.status !== 'queued') return;
    job.status = 'running';
    job.startedAt = new Date();
    try {
      const result = await backend.submit(cloneJob(job), controller.signal);
      const current = jobs.get(jobId);
      if (!current || !isActiveStatus(current.status)) return;
      this.applyBackendResult(current, result);
    } catch (error) {
      const current = jobs.get(jobId);
      if (!current || !isActiveStatus(current.status)) return;
      const code = errorCode(error);
      if (code === 'SANDBOX_TIMEOUT' || code === 'SANDBOX_JOB_CANCELLED') {
        setExpired(current, code, errorMessage(error));
      } else {
        current.status = 'failed';
        current.errorCode = code;
        current.errorMessage = errorMessage(error);
        current.completedAt = new Date();
      }
    } finally {
      const current = jobs.get(jobId);
      if (current && !isActiveStatus(current.status)) {
        this.clearExpiry(jobId);
        controllers.delete(jobId);
      }
    }
  }

  private applyBackendResult(job: SandboxJob, result: SandboxBackendResult): void {
    job.remoteJobId = result.remoteJobId ?? null;
    if (result.status === 'queued' || result.status === 'running') {
      job.status = result.status;
      return;
    }
    if (result.output !== undefined && outputByteLength(result.output) > job.maxOutputBytes) {
      job.status = 'failed';
      job.errorCode = 'SANDBOX_OUTPUT_LIMIT_EXCEEDED';
      job.errorMessage = 'sandbox 결과 크기가 제한을 초과했습니다.';
      job.completedAt = new Date();
      return;
    }
    const completedAt = new Date();
    job.status = 'completed';
    job.result = {
      output: result.output ?? null,
      outputHash: result.outputHash || hashValue(result.output ?? null),
      source: 'remote-firecracker',
      completedAt,
    };
    job.errorCode = null;
    job.errorMessage = null;
    job.completedAt = completedAt;
  }
}

const defaultControlPlane = new SandboxControlPlane();

export function getSandboxControlPlane(): SandboxControlPlane {
  return defaultControlPlane;
}

export function resetSandboxControlPlaneForTests(): void {
  defaultControlPlane.clear();
}
