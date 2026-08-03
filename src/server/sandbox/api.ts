import type { SandboxControlPlane } from './controlPlane';

export function sandboxApiState(
  controlPlane: SandboxControlPlane,
  userId: string,
  jobId?: string | null,
) {
  const backend = controlPlane.getStatus();
  const response: {
    status: string;
    availability: string;
    backend: string;
    execution: string;
    code: string;
    reason: string;
    capabilities: ReturnType<SandboxControlPlane['getCapabilities']>;
    jobs?: ReturnType<SandboxControlPlane['listJobs']>;
    job?: ReturnType<SandboxControlPlane['getJob']>;
    result?: ReturnType<SandboxControlPlane['getJobDetails']> extends infer Details
      ? Details extends { result: infer Result }
        ? Result
        : null
      : null;
  } = {
    status: backend.status,
    availability: backend.availability,
    backend: backend.backend,
    execution: backend.execution,
    code: backend.code,
    reason: backend.reason,
    capabilities: controlPlane.getCapabilities(),
  };

  if (jobId) {
    const details = controlPlane.getJobDetails(userId, jobId);
    response.job = details?.job || null;
    response.result = details?.result || null;
  } else {
    response.jobs = controlPlane.listJobs(userId);
  }
  return response;
}
