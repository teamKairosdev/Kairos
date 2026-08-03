export const SANDBOX_BACKEND_KINDS = ['disabled', 'remote-firecracker', 'windows-sandbox'] as const;
export type SandboxBackendKind = (typeof SANDBOX_BACKEND_KINDS)[number];

export const SANDBOX_JOB_STATUSES = [
  'disabled',
  'available',
  'queued',
  'running',
  'completed',
  'failed',
  'expired',
] as const;
export type SandboxJobStatus = (typeof SANDBOX_JOB_STATUSES)[number];

export type SandboxExecutionMode = 'none' | 'remote-adapter' | 'config-only';
export type SandboxAvailability = 'available' | 'not_configured';

export interface SandboxNetworkPolicy {
  mode: 'none' | 'allowlist';
  allowedHosts: string[];
}

export interface SandboxJobRequest {
  userId: string;
  approvalId: string | null;
  toolName: string;
  action: string;
  input: unknown;
  timeoutMs: number;
  maxOutputBytes: number;
  networkPolicy: SandboxNetworkPolicy;
}

export interface SandboxJobResult {
  output: unknown;
  outputHash: string;
  source: 'remote-firecracker';
  completedAt: Date;
}

export interface SandboxJob extends SandboxJobRequest {
  id: string;
  backend: SandboxBackendKind;
  toolActionHash: string;
  status: SandboxJobStatus;
  result: SandboxJobResult | null;
  remoteJobId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface SandboxBackendStatus {
  backend: SandboxBackendKind;
  status: 'disabled' | 'available';
  availability: SandboxAvailability;
  execution: SandboxExecutionMode;
  code: string;
  reason: string;
}

export interface SandboxCapabilities {
  backend: SandboxBackendKind;
  availability: SandboxAvailability;
  execution: SandboxExecutionMode;
  canSubmit: boolean;
  canCancel: boolean;
  canReadResults: boolean;
  arbitraryCodeExecution: false;
  shellExecution: false;
  powershellExecution: false;
  nodeExecution: false;
  network: {
    defaultPolicy: 'none';
    allowlistOnly: true;
  };
  supportedActions: readonly string[];
  windowsSandbox?: {
    supportedPlatform: boolean;
    autoExecute: false;
    config: string;
    valid: boolean;
    validationErrors: string[];
  };
}

export interface SandboxBackendResult {
  status: 'queued' | 'running' | 'completed';
  output?: unknown;
  outputHash?: string;
  remoteJobId?: string | null;
}

export interface SandboxBackend {
  readonly kind: SandboxBackendKind;
  getStatus(): SandboxBackendStatus;
  getCapabilities(): SandboxCapabilities;
  submit(job: SandboxJob, signal?: AbortSignal): Promise<SandboxBackendResult>;
  cancel(job: SandboxJob, signal?: AbortSignal): Promise<void>;
}

export type SandboxBackendFactory = () => SandboxBackend;
