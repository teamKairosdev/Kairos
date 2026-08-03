export type RunType = 'draft' | 'rewrite' | 'summarize' | 'diff';
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface WorkspaceRecord {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRunRecord {
  id: string;
  workspaceId: string;
  userId: string;
  runType: string;
  status: RunStatus;
  inputHash: string | null;
  outputHash: string | null;
  errorCode: string | null;
  metadata: Record<string, unknown>;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ArtifactRecord {
  id: string;
  workspaceId: string;
  userId: string;
  artifactType: string;
  name: string;
  mimeType: string | null;
  currentVersion: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactVersionRecord {
  id: string;
  artifactId: string;
  userId: string;
  version: number;
  content: string;
  contentHash: string;
  sizeBytes: number | null;
  createdByRunId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface RunEventRecord {
  id: string;
  runId: string;
  userId: string;
  sequence: number;
  eventType: string;
  actorType: string;
  toolName: string | null;
  status: string | null;
  payloadHash: string | null;
  artifactVersionId: string | null;
  errorCode: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ToolStatusRecord {
  id: string;
  workspaceId: string;
  userId: string;
  toolName: string;
  status: string;
  lastRunAt: string | null;
  lastErrorCode: string | null;
  consecutiveFailures: number;
  metadata: Record<string, unknown>;
  updatedAt: string;
}

export interface FeedbackRecord {
  id: string;
  userId: string;
  runId: string | null;
  rating: number | null;
  feedbackType: string;
  comment: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface WorkspaceData {
  workspace: WorkspaceRecord;
  runs: AgentRunRecord[];
  artifacts: ArtifactRecord[];
  toolStatuses: ToolStatusRecord[];
  artifactVersions: Record<string, ArtifactVersionRecord[]>;
  runEvents: Record<string, RunEventRecord[]>;
  feedback: FeedbackRecord[];
}

export interface RunDetails {
  run: AgentRunRecord;
  events: RunEventRecord[];
  artifact: ArtifactRecord | null;
  version: ArtifactVersionRecord | null;
  feedback: FeedbackRecord[];
  error?: { code: string; message: string };
}
