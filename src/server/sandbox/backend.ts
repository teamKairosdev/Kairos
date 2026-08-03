import { hashValue } from '@/server/harness';
import { getSandboxConfig, type SandboxConfig } from './config';
import type {
  SandboxBackend,
  SandboxBackendResult,
  SandboxBackendStatus,
  SandboxCapabilities,
  SandboxJob,
} from './types';

const SUPPORTED_ACTIONS = [
  'read',
  'write',
  'transform',
  'analyze',
  'summarize',
  'diff',
  'fetch',
  'structured-read',
  'structured-write',
  'structured-transform',
] as const;
const REMOTE_CANCEL_TIMEOUT_MS = 5_000;
const MAX_REMOTE_RESPONSE_OVERHEAD_BYTES = 16 * 1024;

export class SandboxBackendError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 503,
  ) {
    super(message);
    this.name = 'SandboxBackendError';
  }
}

function capabilitiesFor(
  status: SandboxBackendStatus,
  windowsSandbox?: SandboxCapabilities['windowsSandbox'],
): SandboxCapabilities {
  return {
    backend: status.backend,
    availability: status.availability,
    execution: status.execution,
    canSubmit: status.execution === 'remote-adapter' && status.availability === 'available',
    canCancel: status.execution === 'remote-adapter' && status.availability === 'available',
    canReadResults: true,
    arbitraryCodeExecution: false,
    shellExecution: false,
    powershellExecution: false,
    nodeExecution: false,
    network: {
      defaultPolicy: 'none',
      allowlistOnly: true,
    },
    supportedActions: SUPPORTED_ACTIONS,
    ...(windowsSandbox ? { windowsSandbox } : {}),
  };
}

function notConfiguredStatus(
  backend: SandboxBackendStatus['backend'],
  code: string,
  reason: string,
): SandboxBackendStatus {
  return {
    backend,
    status: 'disabled',
    availability: 'not_configured',
    execution: 'none',
    code,
    reason,
  };
}

export class DisabledSandboxBackend implements SandboxBackend {
  readonly kind = 'disabled' as const;

  constructor(private readonly config: SandboxConfig = getSandboxConfig()) {}

  getStatus(): SandboxBackendStatus {
    return notConfiguredStatus(
      'disabled',
      this.config.configurationError || 'SANDBOX_NOT_CONFIGURED',
      this.config.configurationError
        ? '지원하지 않는 sandbox backend 설정입니다.'
        : 'sandbox backend가 disabled로 설정되어 있습니다.',
    );
  }

  getCapabilities(): SandboxCapabilities {
    return capabilitiesFor(this.getStatus());
  }

  async submit(): Promise<SandboxBackendResult> {
    throw new SandboxBackendError('sandbox 실행 backend가 구성되지 않았습니다.', 'SANDBOX_NOT_CONFIGURED');
  }

  async cancel(): Promise<void> {
    // There is no local process to cancel when the backend is disabled.
  }
}

export class WindowsSandboxBackend implements SandboxBackend {
  readonly kind = 'windows-sandbox' as const;

  constructor(private readonly config: SandboxConfig = getSandboxConfig()) {}

  getStatus(): SandboxBackendStatus {
    return {
      backend: 'windows-sandbox',
      status: 'available',
      availability: 'not_configured',
      execution: 'config-only',
      code: this.config.windowsSandbox.valid ? 'WINDOWS_SANDBOX_CONFIG_ONLY' : 'WINDOWS_SANDBOX_CONFIG_INVALID',
      reason: this.config.windowsSandbox.valid
        ? 'Windows Sandbox .wsb 설정과 검증 정보만 제공합니다. 자동 실행하지 않습니다.'
        : 'Windows Sandbox 설정값을 검증하지 못했습니다.',
    };
  }

  getCapabilities(): SandboxCapabilities {
    const windows = this.config.windowsSandbox;
    return capabilitiesFor(this.getStatus(), {
      supportedPlatform: windows.supportedPlatform,
      autoExecute: false,
      config: windows.config,
      valid: windows.valid,
      validationErrors: windows.validationErrors,
    });
  }

  async submit(): Promise<SandboxBackendResult> {
    throw new SandboxBackendError(
      'Windows Sandbox는 현재 설정 생성·검증만 지원하며 자동 실행하지 않습니다.',
      'SANDBOX_NOT_CONFIGURED',
    );
  }

  async cancel(): Promise<void> {
    // No process is started by the config-only backend.
  }
}

function serializedOutput(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? 'null';
  } catch {
    throw new SandboxBackendError('sandbox 결과를 직렬화하지 못했습니다.', 'SANDBOX_INVALID_OUTPUT', 502);
  }
}

export async function readResponseBodyLimited(
  response: Response,
  maxBytes: number,
  signal?: AbortSignal,
): Promise<string> {
  const throwIfAborted = () => {
    if (!signal?.aborted) return;
    const reason = signal.reason;
    if (reason instanceof Error) throw reason;
    throw new Error('Sandbox response read aborted');
  };
  throwIfAborted();
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new SandboxBackendError('sandbox 응답 크기가 제한을 초과했습니다.', 'SANDBOX_OUTPUT_LIMIT_EXCEEDED', 502);
  }

  if (!response.body) {
    let abortHandler: (() => void) | undefined;
    const abortPromise = signal
      ? new Promise<never>((_, reject) => {
          abortHandler = () => {
            try {
              throwIfAborted();
            } catch (error) {
              reject(error);
            }
          };
          signal.addEventListener('abort', abortHandler, { once: true });
        })
      : null;
    let text: string;
    try {
      text = await (abortPromise ? Promise.race([response.text(), abortPromise]) : response.text());
    } finally {
      if (signal && abortHandler) signal.removeEventListener('abort', abortHandler);
    }
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new SandboxBackendError('sandbox 응답 크기가 제한을 초과했습니다.', 'SANDBOX_OUTPUT_LIMIT_EXCEEDED', 502);
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  const abortHandler = () => {
    void reader.cancel(signal?.reason);
  };
  signal?.addEventListener('abort', abortHandler, { once: true });
  try {
    while (true) {
      const next = await reader.read();
      throwIfAborted();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel('sandbox output limit exceeded');
        throw new SandboxBackendError('sandbox 응답 크기가 제한을 초과했습니다.', 'SANDBOX_OUTPUT_LIMIT_EXCEEDED', 502);
      }
      chunks.push(next.value);
    }
  } finally {
    signal?.removeEventListener('abort', abortHandler);
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function responsePayload(raw: string): unknown {
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function recordStatus(value: unknown): 'queued' | 'running' | null {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase();
  return normalized === 'queued' || normalized === 'accepted' ? 'queued' : normalized === 'running' ? 'running' : null;
}

export class RemoteFirecrackerBackend implements SandboxBackend {
  readonly kind = 'remote-firecracker' as const;
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly config: SandboxConfig = getSandboxConfig(),
    fetchImpl?: typeof fetch,
  ) {
    this.fetchImpl = fetchImpl || fetch;
  }

  getStatus(): SandboxBackendStatus {
    if (this.config.platform !== 'linux') {
      return notConfiguredStatus(
        'remote-firecracker',
        'SANDBOX_LINUX_REQUIRED',
        'remote Firecracker 요청은 Linux 서버에서만 허용됩니다.',
      );
    }
    if (!this.config.remoteFirecracker.endpoint || !this.config.remoteFirecracker.token) {
      return notConfiguredStatus(
        'remote-firecracker',
        'SANDBOX_NOT_CONFIGURED',
        'Firecracker endpoint와 token은 서버 환경변수로 함께 구성해야 합니다.',
      );
    }
    if (!this.config.remoteFirecracker.configured) {
      return notConfiguredStatus(
        'remote-firecracker',
        'SANDBOX_ENDPOINT_INVALID',
        'Firecracker remote endpoint 설정을 검증하지 못했습니다.',
      );
    }
    return {
      backend: 'remote-firecracker',
      status: 'available',
      availability: 'available',
      execution: 'remote-adapter',
      code: 'SANDBOX_REMOTE_READY',
      reason: '검증된 구조화 job을 Linux remote Firecracker endpoint로 전달할 수 있습니다.',
    };
  }

  getCapabilities(): SandboxCapabilities {
    return capabilitiesFor(this.getStatus());
  }

  private endpoint(): string {
    const status = this.getStatus();
    if (status.availability !== 'available' || !this.config.remoteFirecracker.endpoint) {
      throw new SandboxBackendError(status.reason, status.code);
    }
    return this.config.remoteFirecracker.endpoint;
  }

  private async fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit,
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const forwardAbort = () => controller.abort(init.signal?.reason);
    if (init.signal) {
      if (init.signal.aborted) forwardAbort();
      else init.signal.addEventListener('abort', forwardAbort, { once: true });
    }
    const timeoutId = setTimeout(() => controller.abort(new Error('Sandbox request timed out')), timeoutMs);
    try {
      return await this.fetchImpl(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
      init.signal?.removeEventListener('abort', forwardAbort);
    }
  }

  async submit(job: SandboxJob, signal?: AbortSignal): Promise<SandboxBackendResult> {
    const endpoint = this.endpoint();
    const token = this.config.remoteFirecracker.token;
    if (!token) throw new SandboxBackendError('Firecracker token이 구성되지 않았습니다.', 'SANDBOX_NOT_CONFIGURED');

    const startedAt = Date.now();
    let response: Response;
    try {
      response = await this.fetchWithTimeout(
        endpoint,
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
            'x-kairos-sandbox-protocol': 'v1',
          },
          body: JSON.stringify({
            version: 1,
            jobId: job.id,
            userId: job.userId,
            approvalId: job.approvalId,
            toolName: job.toolName,
            action: job.action,
            input: job.input,
            toolActionHash: job.toolActionHash,
            timeoutMs: job.timeoutMs,
            maxOutputBytes: job.maxOutputBytes,
            networkPolicy: job.networkPolicy,
          }),
          signal,
        },
        job.timeoutMs,
      );
    } catch (error) {
      if (signal?.aborted) {
        throw new SandboxBackendError('sandbox job가 취소되었습니다.', 'SANDBOX_JOB_CANCELLED', 409);
      }
      if (error instanceof Error && /timed out|timeout|abort/i.test(error.message)) {
        throw new SandboxBackendError('sandbox job 시간이 초과되었습니다.', 'SANDBOX_TIMEOUT', 504);
      }
      throw new SandboxBackendError('remote Firecracker endpoint에 연결하지 못했습니다.', 'SANDBOX_REMOTE_UNAVAILABLE', 502);
    }

    const responseLimit = Math.min(
      MAX_REMOTE_RESPONSE_OVERHEAD_BYTES + job.maxOutputBytes,
      2 * 1024 * 1024,
    );
    let raw: string;
    const bodyController = new AbortController();
    const forwardAbort = () => bodyController.abort(signal?.reason || new Error('Sandbox job cancelled'));
    if (signal?.aborted) forwardAbort();
    else signal?.addEventListener('abort', forwardAbort, { once: true });
    const remainingTimeoutMs = Math.max(1, job.timeoutMs - (Date.now() - startedAt));
    const bodyTimeoutId = setTimeout(
      () => bodyController.abort(new Error('Sandbox request timed out')),
      remainingTimeoutMs,
    );
    try {
      raw = await readResponseBodyLimited(response, responseLimit, bodyController.signal);
    } catch (error) {
      if (error instanceof SandboxBackendError) throw error;
      if (signal?.aborted) {
        throw new SandboxBackendError('sandbox job가 취소되었습니다.', 'SANDBOX_JOB_CANCELLED', 409);
      }
      if (error instanceof Error && /timed out|timeout|abort/i.test(error.message)) {
        throw new SandboxBackendError('sandbox job 시간이 초과되었습니다.', 'SANDBOX_TIMEOUT', 504);
      }
      throw new SandboxBackendError('sandbox 응답을 읽지 못했습니다.', 'SANDBOX_REMOTE_ERROR', 502);
    } finally {
      clearTimeout(bodyTimeoutId);
      signal?.removeEventListener('abort', forwardAbort);
    }
    if (!response.ok) {
      throw new SandboxBackendError('remote Firecracker endpoint가 job을 거부했습니다.', 'SANDBOX_REMOTE_ERROR', 502);
    }

    const payload = responsePayload(raw);
    const payloadStatus = isRecord(payload) && typeof payload.status === 'string'
      ? payload.status.toLowerCase()
      : null;
    if (payloadStatus === 'expired' || payloadStatus === 'timeout' || payloadStatus === 'timed_out') {
      throw new SandboxBackendError('remote sandbox job 시간이 초과되었습니다.', 'SANDBOX_TIMEOUT', 504);
    }
    if (payloadStatus === 'failed' || payloadStatus === 'rejected' || payloadStatus === 'error') {
      throw new SandboxBackendError('remote sandbox backend가 job을 실패 처리했습니다.', 'SANDBOX_REMOTE_FAILED', 502);
    }
    const remoteStatus = recordStatus(payloadStatus);
    if (response.status === 202 || remoteStatus) {
      return {
        status: remoteStatus || 'queued',
        remoteJobId: isRecord(payload) && typeof payload.jobId === 'string' ? payload.jobId : null,
      };
    }

    const output = isRecord(payload) && Object.prototype.hasOwnProperty.call(payload, 'output')
      ? payload.output
      : isRecord(payload) && Object.prototype.hasOwnProperty.call(payload, 'result')
        ? payload.result
        : payload;
    const outputText = serializedOutput(output);
    if (new TextEncoder().encode(outputText).byteLength > job.maxOutputBytes) {
      throw new SandboxBackendError('sandbox 결과 크기가 제한을 초과했습니다.', 'SANDBOX_OUTPUT_LIMIT_EXCEEDED', 502);
    }
    return {
      status: 'completed',
      output,
      outputHash: hashValue(output),
      remoteJobId: isRecord(payload) && typeof payload.jobId === 'string' ? payload.jobId : null,
    };
  }

  async cancel(job: SandboxJob, signal?: AbortSignal): Promise<void> {
    const endpoint = this.endpoint();
    const token = this.config.remoteFirecracker.token;
    if (!token) return;
    const url = new URL(endpoint);
    url.pathname = `${url.pathname.replace(/\/$/, '')}/jobs/${encodeURIComponent(job.remoteJobId || job.id)}/cancel`;
    try {
      await this.fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${token}`,
          },
          signal,
        },
        REMOTE_CANCEL_TIMEOUT_MS,
      );
    } catch {
      // Local state is still moved to expired; remote cancellation is best effort.
    }
  }
}

export function createSandboxBackend(config: SandboxConfig = getSandboxConfig()): SandboxBackend {
  if (config.backend === 'remote-firecracker') return new RemoteFirecrackerBackend(config);
  if (config.backend === 'windows-sandbox') return new WindowsSandboxBackend(config);
  return new DisabledSandboxBackend(config);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
