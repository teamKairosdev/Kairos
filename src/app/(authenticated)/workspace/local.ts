import type {
  AgentRunRecord,
  ArtifactRecord,
  ArtifactVersionRecord,
  FeedbackRecord,
  RunDetails,
  RunEventRecord,
  RunType,
  ToolStatusRecord,
  WorkspaceData,
  WorkspaceRecord,
} from './types';

export const MOCK_WORKSPACE_KEY = 'kairos_agent_workspace_mvp';

const TOOL_DEFINITIONS = [
  {
    name: 'text-editor',
    status: 'available',
    description: '로컬 텍스트 변환만 지원',
  },
  {
    name: 'web-fetch',
    status: 'unsupported',
    description: '외부 웹페치 미지원',
  },
  {
    name: 'shell',
    status: 'disabled',
    description: '쉘과 VM 실행 미지원',
  },
] as const;

function now(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hash(value: string): string {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) | 0;
  }
  return `mock-${Math.abs(result).toString(16)}`;
}

function clean(value: string): string {
  return value.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}

function event(
  run: AgentRunRecord,
  sequence: number,
  eventType: string,
  status: string,
  extra: Partial<RunEventRecord> = {},
): RunEventRecord {
  return {
    id: id('mock-event'),
    runId: run.id,
    userId: run.userId,
    sequence,
    eventType,
    actorType: 'agent',
    toolName: null,
    status,
    payloadHash: null,
    artifactVersionId: null,
    errorCode: null,
    metadata: {},
    createdAt: now(),
    ...extra,
  };
}

export function createMockWorkspaceData(name = 'Mock Canvas', workspaceId = 'mock-agent-workspace'): WorkspaceData {
  const createdAt = now();
  const workspace: WorkspaceRecord = {
    id: workspaceId,
    userId: 'mock-user',
    name,
    description: '브라우저 mock 모드에서만 사용하는 로컬 캔버스',
    status: 'active',
    settings: { execution: 'local-only' },
    createdAt,
    updatedAt: createdAt,
  };
  const toolStatuses: ToolStatusRecord[] = TOOL_DEFINITIONS.map((tool) => ({
    id: id('mock-tool'),
    workspaceId: workspace.id,
    userId: workspace.userId,
    toolName: tool.name,
    status: tool.status,
    lastRunAt: null,
    lastErrorCode: null,
    consecutiveFailures: 0,
    metadata: { description: tool.description, execution: tool.name === 'text-editor' ? 'local-only' : 'disabled' },
    updatedAt: createdAt,
  }));
  return {
    workspace,
    runs: [],
    artifacts: [],
    toolStatuses,
    artifactVersions: {},
    runEvents: {},
    feedback: [],
  };
}

export function readMockWorkspaceList(): WorkspaceData[] {
  if (typeof window === 'undefined') return [createMockWorkspaceData()];
  try {
    const stored = localStorage.getItem(MOCK_WORKSPACE_KEY);
    if (!stored) return [createMockWorkspaceData()];
    const parsed = JSON.parse(stored) as WorkspaceData | { workspaces?: WorkspaceData[] };
    if ('workspaces' in parsed && Array.isArray(parsed.workspaces)) {
      return parsed.workspaces
        .filter((item) => item?.workspace && Array.isArray(item.runs))
        .map((item) => ({ ...item, runEvents: item.runEvents || {} }));
    }
    if ('workspace' in parsed && parsed.workspace && Array.isArray(parsed.runs)) {
      return [{ ...parsed, runEvents: parsed.runEvents || {} }];
    }
  } catch {
    return [createMockWorkspaceData()];
  }
  return [createMockWorkspaceData()];
}

export function readMockWorkspaceData(): WorkspaceData {
  return readMockWorkspaceList()[0] || createMockWorkspaceData();
}

export function writeMockWorkspaceData(data: WorkspaceData): void {
  if (typeof window === 'undefined') return;
  const workspaces = readMockWorkspaceList().filter((item) => item.workspace.id !== data.workspace.id);
  localStorage.setItem(MOCK_WORKSPACE_KEY, JSON.stringify({ workspaces: [data, ...workspaces] }));
}

export function writeMockWorkspaceList(data: WorkspaceData[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MOCK_WORKSPACE_KEY, JSON.stringify({ workspaces: data }));
}

function localOutput(input: {
  runType: RunType;
  command: string;
  content: string;
  baseContent: string;
  targetContent: string;
}): string {
  const command = clean(input.command);
  const content = clean(input.content || command);
  if (input.runType === 'draft') {
    return `# ${command.split('\n', 1)[0].slice(0, 80)}\n\n${content}\n\n---\n\n> 외부 모델과 도구 없이 mock 로컬 규칙으로 만든 초안입니다.`;
  }
  if (input.runType === 'rewrite') {
    return `# 로컬 재작성 결과\n\n${content.replace(/^\s*\*\s+/gm, '- ').replace(/\s+([,.;:!?])/g, '$1')}`;
  }
  if (input.runType === 'summarize') {
    const points = content
      .replace(/^#{1,6}\s+/gm, '')
      .split(/\n+|(?<=[.!?。！？])\s+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 5);
    return `# 로컬 요약\n\n${(points.length ? points : ['요약할 내용이 없습니다.']).map((item) => `- ${item}`).join('\n')}`;
  }
  if (!clean(input.baseContent) || !clean(input.targetContent)) {
    throw new Error('Diff 작업에는 이전 내용과 새 내용이 필요합니다.');
  }
  return clean(input.targetContent);
}

export function runMockTask(
  data: WorkspaceData,
  input: {
    runType: RunType;
    command: string;
    content: string;
    baseContent: string;
    targetContent: string;
    artifactId?: string;
  },
): { data: WorkspaceData; details: RunDetails } {
  const createdAt = now();
  const run: AgentRunRecord = {
    id: id('mock-run'),
    workspaceId: data.workspace.id,
    userId: data.workspace.userId,
    runType: input.runType,
    status: 'queued',
    inputHash: hash(JSON.stringify(input)),
    outputHash: null,
    errorCode: null,
    metadata: { command: input.command, localOnly: true },
    startedAt: null,
    completedAt: null,
    createdAt,
  };
  let events = [event(run, 1, 'run_queued', 'queued')];
  run.status = 'running';
  run.startedAt = now();
  events = [...events, event(run, 2, 'run_started', 'running')];
  events = [...events, event(run, 3, 'tool_status', 'available', { toolName: 'text-editor', metadata: { execution: 'local-only' } })];

  try {
    const content = localOutput(input);
    const artifact = data.artifacts.find((item) => item.id === input.artifactId) || {
      id: id('mock-artifact'),
      workspaceId: data.workspace.id,
      userId: data.workspace.userId,
      artifactType: 'markdown',
      name: 'Canvas 결과',
      mimeType: 'text/markdown',
      currentVersion: 0,
      metadata: { localOnly: true },
      createdAt,
      updatedAt: createdAt,
    } satisfies ArtifactRecord;
    const version: ArtifactVersionRecord = {
      id: id('mock-version'),
      artifactId: artifact.id,
      userId: data.workspace.userId,
      version: artifact.currentVersion + 1,
      content,
      contentHash: hash(content),
      sizeBytes: content.length,
      createdByRunId: run.id,
      metadata: { runType: input.runType, localOnly: true },
      createdAt: now(),
    };
    const nextArtifact: ArtifactRecord = { ...artifact, currentVersion: version.version, updatedAt: now() };
    run.status = 'completed';
    run.outputHash = version.contentHash;
    run.completedAt = now();
    events = [
      ...events,
      event(run, 4, 'run_completed', 'completed', {
        artifactVersionId: version.id,
        metadata: { artifactId: nextArtifact.id, version: version.version },
      }),
    ];
    const nextData: WorkspaceData = {
      ...data,
      workspace: { ...data.workspace, updatedAt: now() },
      runs: [run, ...data.runs],
      artifacts: [nextArtifact, ...data.artifacts.filter((item) => item.id !== nextArtifact.id)],
      toolStatuses: data.toolStatuses.map((tool) => tool.toolName === 'text-editor' ? { ...tool, lastRunAt: now(), updatedAt: now() } : tool),
      artifactVersions: {
        ...data.artifactVersions,
        [nextArtifact.id]: [version, ...(data.artifactVersions[nextArtifact.id] || [])],
      },
      runEvents: { ...data.runEvents, [run.id]: events },
    };
    return {
      data: nextData,
      details: { run, events, artifact: nextArtifact, version, feedback: [] },
    };
  } catch (error: unknown) {
    run.status = 'failed';
    run.errorCode = 'LOCAL_TASK_FAILED';
    run.completedAt = now();
    events = [...events, event(run, 4, 'run_failed', 'failed', { errorCode: run.errorCode, metadata: { message: error instanceof Error ? error.message : '로컬 작업 실패' } })];
    const nextData = { ...data, runs: [run, ...data.runs], runEvents: { ...data.runEvents, [run.id]: events } };
    return {
      data: nextData,
      details: {
        run,
        events,
        artifact: null,
        version: null,
        feedback: [],
        error: { code: run.errorCode, message: error instanceof Error ? error.message : '로컬 작업 실패' },
      },
    };
  }
}

export function restoreMockVersion(data: WorkspaceData, artifactId: string, versionNumber: number): WorkspaceData {
  const artifact = data.artifacts.find((item) => item.id === artifactId);
  const source = data.artifactVersions[artifactId]?.find((item) => item.version === versionNumber);
  if (!artifact || !source) throw new Error('복원할 version을 찾을 수 없습니다.');
  const restored: ArtifactVersionRecord = {
    ...source,
    id: id('mock-version'),
    version: artifact.currentVersion + 1,
    createdByRunId: null,
    metadata: { ...source.metadata, action: 'restore', restoredFromVersion: versionNumber },
    createdAt: now(),
  };
  return {
    ...data,
    workspace: { ...data.workspace, updatedAt: now() },
    artifacts: data.artifacts.map((item) => item.id === artifactId ? { ...item, currentVersion: restored.version, updatedAt: now() } : item),
    artifactVersions: { ...data.artifactVersions, [artifactId]: [restored, ...(data.artifactVersions[artifactId] || [])] },
  };
}

export function addMockVersion(data: WorkspaceData, artifactId: string, content: string): WorkspaceData {
  const artifact = data.artifacts.find((item) => item.id === artifactId);
  if (!artifact) throw new Error('Artifact를 찾을 수 없습니다.');
  const version: ArtifactVersionRecord = {
    id: id('mock-version'),
    artifactId,
    userId: data.workspace.userId,
    version: artifact.currentVersion + 1,
    content,
    contentHash: hash(content),
    sizeBytes: content.length,
    createdByRunId: null,
    metadata: { source: 'manual-edit', localOnly: true },
    createdAt: now(),
  };
  return {
    ...data,
    workspace: { ...data.workspace, updatedAt: now() },
    artifacts: data.artifacts.map((item) => item.id === artifactId ? { ...item, currentVersion: version.version, updatedAt: now() } : item),
    artifactVersions: { ...data.artifactVersions, [artifactId]: [version, ...(data.artifactVersions[artifactId] || [])] },
  };
}

export function addMockFeedback(data: WorkspaceData, input: { runId: string; rating: number | null; feedbackType: string; comment: string }): WorkspaceData {
  const feedback: FeedbackRecord = {
    id: id('mock-feedback'),
    userId: data.workspace.userId,
    runId: input.runId,
    rating: input.rating,
    feedbackType: input.feedbackType,
    comment: input.comment || null,
    metadata: { localOnly: true },
    createdAt: now(),
  };
  return { ...data, feedback: [feedback, ...data.feedback] };
}
