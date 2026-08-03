import { createHash } from 'node:crypto';
import { diffLines } from 'diff';
import { and, asc, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import {
  agentArtifacts,
  agentArtifactVersions,
  agentFeedback,
  agentRunEvents,
  agentRuns,
  agentToolStatus,
  agentWorkspaces,
} from '@/db/schema';

export const SUPPORTED_RUN_TYPES = ['draft', 'rewrite', 'summarize', 'diff'] as const;
export type AgentRunType = (typeof SUPPORTED_RUN_TYPES)[number];
export type AgentRunStatus = 'queued' | 'running' | 'completed' | 'failed';

export const DEFAULT_TOOL_STATUS_DEFINITIONS = [
  {
    toolName: 'text-editor',
    status: 'available',
    metadata: {
      execution: 'local-only',
      description: '로컬 텍스트 변환과 Markdown artifact만 지원합니다.',
    },
  },
  {
    toolName: 'web-fetch',
    status: 'unsupported',
    metadata: {
      execution: 'disabled',
      description: '외부 웹페치는 MVP에서 실행하지 않습니다.',
    },
  },
  {
    toolName: 'shell',
    status: 'disabled',
    metadata: {
      execution: 'disabled',
      description: '쉘 명령과 VM 실행은 MVP에서 지원하지 않습니다.',
    },
  },
] as const;

type AgentDb = NonNullable<ReturnType<typeof getDb>>;

export interface LocalTaskInput {
  runType: string;
  command: string;
  content?: string;
  baseContent?: string;
  targetContent?: string;
}

export interface LocalTaskOutput {
  content: string;
  title: string;
  metadata: Record<string, unknown>;
}

export interface ArtifactVersionInput {
  workspaceId: string;
  artifactId?: string;
  artifactType?: string;
  name?: string;
  mimeType?: string;
  content: string;
  createdByRunId?: string | null;
  metadata?: Record<string, unknown>;
}

export class AgentWorkspaceError extends Error {
  constructor(
    message: string,
    public readonly code = 'AGENT_WORKSPACE_ERROR',
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'AgentWorkspaceError';
  }
}

export function isSupportedRunType(value: unknown): value is AgentRunType {
  return typeof value === 'string' && (SUPPORTED_RUN_TYPES as readonly string[]).includes(value);
}

export function normalizeRunType(value: unknown): AgentRunType | null {
  return isSupportedRunType(value) ? value : null;
}

export function hashContent(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function cleanText(value: string): string {
  return value.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}

function titleFromCommand(command: string): string {
  const firstLine = command.split(/\r?\n/, 1)[0]?.trim() || '로컬 작업 결과';
  return firstLine.replace(/^#+\s*/, '').slice(0, 80) || '로컬 작업 결과';
}

function summarizeText(source: string): string[] {
  const normalized = cleanText(source)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '');
  const sentences = normalized
    .split(/\n+|(?<=[.!?。！？])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return Array.from(new Set(sentences)).slice(0, 5);
}

/**
 * Deterministic, local-only task execution. This function deliberately has no
 * model, shell, VM, filesystem, or network dependency.
 */
export function executeLocalTask(input: LocalTaskInput): LocalTaskOutput {
  const runType = normalizeRunType(input.runType);
  if (!runType) {
    throw new AgentWorkspaceError('지원하지 않는 작업 유형입니다.', 'UNSUPPORTED_RUN_TYPE', 400);
  }

  const command = cleanText(input.command);
  if (!command) {
    throw new AgentWorkspaceError('사용자 명령을 입력해주세요.', 'EMPTY_COMMAND', 400);
  }

  if (runType === 'draft') {
    const body = cleanText(input.content || command);
    return {
      title: titleFromCommand(command),
      content: `# ${titleFromCommand(command)}\n\n${body}\n\n---\n\n> 외부 모델과 도구 없이 로컬 규칙으로 만든 초안입니다.`,
      metadata: { mode: 'local-template', sourceLength: body.length },
    };
  }

  if (runType === 'rewrite') {
    const source = cleanText(input.content || command);
    const rewritten = source
      .replace(/^\s*\*\s+/gm, '- ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/\n{3,}/g, '\n\n');
    return {
      title: '로컬 재작성 결과',
      content: `# 로컬 재작성 결과\n\n${rewritten}`,
      metadata: { mode: 'format-normalize', sourceLength: source.length },
    };
  }

  if (runType === 'summarize') {
    const source = cleanText(input.content || command);
    const points = summarizeText(source);
    return {
      title: '로컬 요약 결과',
      content: `# 로컬 요약\n\n${(points.length ? points : ['요약할 내용이 없습니다.'])
        .map((point) => `- ${point}`)
        .join('\n')}\n\n> 외부 모델 없이 입력 문장의 앞부분을 규칙 기반으로 추출했습니다.`,
      metadata: { mode: 'sentence-extraction', sourceLength: source.length, pointCount: points.length },
    };
  }

  const before = cleanText(input.baseContent ?? input.content ?? '');
  const after = cleanText(input.targetContent ?? command);
  if (!before || !after) {
    throw new AgentWorkspaceError('Diff 작업에는 비교할 이전 내용과 새 내용이 필요합니다.', 'DIFF_CONTENT_REQUIRED', 400);
  }
  const changes = diffLines(before, after);
  return {
    title: '로컬 Diff 결과',
    content: after,
    metadata: {
      mode: 'line-diff',
      addedLines: changes.filter((change) => change.added).reduce((count, change) => count + (change.count || 0), 0),
      removedLines: changes.filter((change) => change.removed).reduce((count, change) => count + (change.count || 0), 0),
      sourceLength: before.length,
      targetLength: after.length,
    },
  };
}

function errorCode(error: unknown): string {
  if (error instanceof AgentWorkspaceError) return error.code;
  if (error instanceof Error && error.name) return error.name.slice(0, 100);
  return 'AGENT_RUN_FAILED';
}

function errorMessage(error: unknown): string {
  if (error instanceof AgentWorkspaceError || error instanceof Error) return error.message;
  return '로컬 작업을 완료하지 못했습니다.';
}

export async function ensureWorkspaceToolStatuses(db: AgentDb, userId: string, workspaceId: string) {
  const existing = await db
    .select()
    .from(agentToolStatus)
    .where(and(eq(agentToolStatus.workspaceId, workspaceId), eq(agentToolStatus.userId, userId)));
  const existingNames = new Set(existing.map((status) => status.toolName));
  const missing = DEFAULT_TOOL_STATUS_DEFINITIONS
    .filter((definition) => !existingNames.has(definition.toolName))
    .map((definition) => ({
      workspaceId,
      userId,
      toolName: definition.toolName,
      status: definition.status,
      metadata: { ...definition.metadata },
    }));

  if (missing.length > 0) {
    await db.insert(agentToolStatus).values(missing).onConflictDoNothing();
  }

  return db
    .select()
    .from(agentToolStatus)
    .where(and(eq(agentToolStatus.workspaceId, workspaceId), eq(agentToolStatus.userId, userId)));
}

export async function findOwnedWorkspace(db: AgentDb, userId: string, workspaceId: string) {
  const [workspace] = await db
    .select()
    .from(agentWorkspaces)
    .where(and(eq(agentWorkspaces.id, workspaceId), eq(agentWorkspaces.userId, userId)))
    .limit(1);
  return workspace;
}

export async function findOwnedRun(db: AgentDb, userId: string, runId: string) {
  const [run] = await db
    .select()
    .from(agentRuns)
    .where(and(eq(agentRuns.id, runId), eq(agentRuns.userId, userId)))
    .limit(1);
  return run;
}

export async function findOwnedArtifact(db: AgentDb, userId: string, artifactId: string, workspaceId?: string) {
  const conditions = [eq(agentArtifacts.id, artifactId), eq(agentArtifacts.userId, userId)];
  if (workspaceId) conditions.push(eq(agentArtifacts.workspaceId, workspaceId));
  const [artifact] = await db.select().from(agentArtifacts).where(and(...conditions)).limit(1);
  return artifact;
}

export async function findOwnedArtifactVersion(db: AgentDb, userId: string, artifactId: string, version: number) {
  const [artifactVersion] = await db
    .select()
    .from(agentArtifactVersions)
    .where(
      and(
        eq(agentArtifactVersions.artifactId, artifactId),
        eq(agentArtifactVersions.userId, userId),
        eq(agentArtifactVersions.version, version),
      ),
    )
    .limit(1);
  return artifactVersion;
}

export async function createWorkspace(
  db: AgentDb,
  userId: string,
  input: { name?: string; description?: string | null },
) {
  const name = cleanText(input.name || '') || '새 에이전트 워크스페이스';
  const [workspace] = await db
    .insert(agentWorkspaces)
    .values({
      userId,
      name: name.slice(0, 160),
      description: input.description ? cleanText(input.description).slice(0, 2000) : null,
      status: 'active',
      settings: { execution: 'local-only', supportedRunTypes: [...SUPPORTED_RUN_TYPES] },
    })
    .returning();

  if (!workspace) throw new AgentWorkspaceError('워크스페이스를 생성하지 못했습니다.', 'WORKSPACE_CREATE_FAILED', 500);
  await ensureWorkspaceToolStatuses(db, userId, workspace.id);
  return workspace;
}

export async function listWorkspaces(db: AgentDb, userId: string) {
  return db
    .select()
    .from(agentWorkspaces)
    .where(eq(agentWorkspaces.userId, userId))
    .orderBy(desc(agentWorkspaces.updatedAt), desc(agentWorkspaces.createdAt));
}

export async function getWorkspaceDetails(db: AgentDb, userId: string, workspaceId: string) {
  const workspace = await findOwnedWorkspace(db, userId, workspaceId);
  if (!workspace) return null;
  const toolStatuses = await ensureWorkspaceToolStatuses(db, userId, workspaceId);
  const [runs, artifacts] = await Promise.all([
    db
      .select()
      .from(agentRuns)
      .where(and(eq(agentRuns.workspaceId, workspaceId), eq(agentRuns.userId, userId)))
      .orderBy(desc(agentRuns.createdAt))
      .limit(50),
    db
      .select()
      .from(agentArtifacts)
      .where(and(eq(agentArtifacts.workspaceId, workspaceId), eq(agentArtifacts.userId, userId)))
      .orderBy(desc(agentArtifacts.updatedAt))
      .limit(50),
  ]);
  return { workspace, runs, artifacts, toolStatuses };
}

export async function listRuns(db: AgentDb, userId: string, workspaceId?: string) {
  const conditions = [eq(agentRuns.userId, userId)];
  if (workspaceId) conditions.push(eq(agentRuns.workspaceId, workspaceId));
  return db
    .select()
    .from(agentRuns)
    .where(and(...conditions))
    .orderBy(desc(agentRuns.createdAt))
    .limit(100);
}

export async function listArtifacts(db: AgentDb, userId: string, workspaceId?: string) {
  const conditions = [eq(agentArtifacts.userId, userId)];
  if (workspaceId) conditions.push(eq(agentArtifacts.workspaceId, workspaceId));
  return db
    .select()
    .from(agentArtifacts)
    .where(and(...conditions))
    .orderBy(desc(agentArtifacts.updatedAt))
    .limit(100);
}

export async function createArtifactVersion(db: AgentDb, userId: string, input: ArtifactVersionInput) {
  const workspace = await findOwnedWorkspace(db, userId, input.workspaceId);
  if (!workspace) throw new AgentWorkspaceError('워크스페이스를 찾을 수 없습니다.', 'WORKSPACE_NOT_FOUND', 404);

  if (input.createdByRunId) {
    const run = await findOwnedRun(db, userId, input.createdByRunId);
    if (!run || run.workspaceId !== input.workspaceId) {
      throw new AgentWorkspaceError('연결할 실행을 찾을 수 없습니다.', 'RUN_NOT_FOUND', 404);
    }
  }

  let artifact;
  if (input.artifactId) {
    artifact = await findOwnedArtifact(db, userId, input.artifactId, input.workspaceId);
    if (!artifact) throw new AgentWorkspaceError('Artifact를 찾을 수 없습니다.', 'ARTIFACT_NOT_FOUND', 404);
  } else {
    const [created] = await db
      .insert(agentArtifacts)
      .values({
        workspaceId: input.workspaceId,
        userId,
        artifactType: input.artifactType || 'markdown',
        name: (input.name || 'Canvas 결과').slice(0, 255),
        mimeType: input.mimeType || 'text/markdown',
        currentVersion: 0,
        metadata: input.metadata || {},
      })
      .returning();
    artifact = created;
    if (!artifact) throw new AgentWorkspaceError('Artifact를 생성하지 못했습니다.', 'ARTIFACT_CREATE_FAILED', 500);
  }

  const nextVersion = Math.max(1, artifact.currentVersion + 1);
  const [version] = await db
    .insert(agentArtifactVersions)
    .values({
      artifactId: artifact.id,
      userId,
      version: nextVersion,
      content: input.content,
      contentHash: hashContent(input.content),
      sizeBytes: Buffer.byteLength(input.content, 'utf8'),
      createdByRunId: input.createdByRunId ?? null,
      metadata: input.metadata || {},
    })
    .returning();
  if (!version) throw new AgentWorkspaceError('Artifact version을 생성하지 못했습니다.', 'VERSION_CREATE_FAILED', 500);

  const [updatedArtifact] = await db
    .update(agentArtifacts)
    .set({ currentVersion: nextVersion, updatedAt: new Date() })
    .where(and(eq(agentArtifacts.id, artifact.id), eq(agentArtifacts.userId, userId)))
    .returning();

  return { artifact: updatedArtifact || { ...artifact, currentVersion: nextVersion }, version };
}

export async function getArtifactDetails(db: AgentDb, userId: string, artifactId: string) {
  const artifact = await findOwnedArtifact(db, userId, artifactId);
  if (!artifact) return null;
  const versions = await db
    .select()
    .from(agentArtifactVersions)
    .where(and(eq(agentArtifactVersions.artifactId, artifactId), eq(agentArtifactVersions.userId, userId)))
    .orderBy(desc(agentArtifactVersions.version));
  return { artifact, versions };
}

export async function restoreArtifactVersion(db: AgentDb, userId: string, artifactId: string, versionNumber: number) {
  const artifact = await findOwnedArtifact(db, userId, artifactId);
  if (!artifact) throw new AgentWorkspaceError('Artifact를 찾을 수 없습니다.', 'ARTIFACT_NOT_FOUND', 404);
  const source = await findOwnedArtifactVersion(db, userId, artifactId, versionNumber);
  if (!source) throw new AgentWorkspaceError('Artifact version을 찾을 수 없습니다.', 'VERSION_NOT_FOUND', 404);
  return createArtifactVersion(db, userId, {
    workspaceId: artifact.workspaceId,
    artifactId,
    content: source.content,
    metadata: { ...source.metadata, restoredFromVersion: source.version, action: 'restore' },
  });
}

async function appendRunEvent(
  db: AgentDb,
  input: {
    runId: string;
    userId: string;
    sequence: number;
    eventType: string;
    status?: string;
    toolName?: string | null;
    artifactVersionId?: string | null;
    errorCode?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const [event] = await db
    .insert(agentRunEvents)
    .values({
      runId: input.runId,
      userId: input.userId,
      sequence: input.sequence,
      eventType: input.eventType,
      actorType: 'agent',
      toolName: input.toolName ?? null,
      status: input.status ?? null,
      artifactVersionId: input.artifactVersionId ?? null,
      errorCode: input.errorCode ?? null,
      payloadHash: input.metadata ? hashContent(JSON.stringify(input.metadata)) : null,
      metadata: input.metadata || {},
    })
    .returning();
  return event;
}

async function markRunFailed(db: AgentDb, userId: string, runId: string, sequence: number, error: unknown) {
  const code = errorCode(error);
  const [run] = await db
    .update(agentRuns)
    .set({ status: 'failed', errorCode: code, completedAt: new Date() })
    .where(and(eq(agentRuns.id, runId), eq(agentRuns.userId, userId)))
    .returning();
  try {
    await appendRunEvent(db, {
      runId,
      userId,
      sequence,
      eventType: 'run_failed',
      status: 'failed',
      errorCode: code,
      metadata: { message: errorMessage(error) },
    });
  } catch {
    // Keep the failed run result even if event persistence also fails.
  }
  return { run, code, message: errorMessage(error) };
}

export async function executeAgentRun(
  db: AgentDb,
  userId: string,
  input: {
    workspaceId: string;
    runType: AgentRunType;
    command: string;
    content?: string;
    baseContent?: string;
    targetContent?: string;
    artifactId?: string;
    artifactName?: string;
  },
) {
  const workspace = await findOwnedWorkspace(db, userId, input.workspaceId);
  if (!workspace) throw new AgentWorkspaceError('워크스페이스를 찾을 수 없습니다.', 'WORKSPACE_NOT_FOUND', 404);
  await ensureWorkspaceToolStatuses(db, userId, input.workspaceId);

  if (input.artifactId) {
    const artifact = await findOwnedArtifact(db, userId, input.artifactId, input.workspaceId);
    if (!artifact) throw new AgentWorkspaceError('Artifact를 찾을 수 없습니다.', 'ARTIFACT_NOT_FOUND', 404);
  }

  let content = input.content;
  let baseContent = input.baseContent;
  if (input.artifactId) {
    const [latestVersion] = await db
      .select()
      .from(agentArtifactVersions)
      .where(and(eq(agentArtifactVersions.artifactId, input.artifactId), eq(agentArtifactVersions.userId, userId)))
      .orderBy(desc(agentArtifactVersions.version))
      .limit(1);
    if (!content && latestVersion) content = latestVersion.content;
    if (input.runType === 'diff' && !baseContent && latestVersion) baseContent = latestVersion.content;
  }

  const inputHash = hashContent(
    JSON.stringify({
      runType: input.runType,
      command: input.command,
      content: content || '',
      baseContent: baseContent || '',
      targetContent: input.targetContent || '',
    }),
  );
  const [createdRun] = await db
    .insert(agentRuns)
    .values({
      workspaceId: input.workspaceId,
      userId,
      runType: input.runType,
      status: 'queued',
      inputHash,
      metadata: {
        command: input.command,
        localOnly: true,
        toolPolicy: { 'text-editor': 'available', 'web-fetch': 'unsupported', shell: 'disabled' },
      },
    })
    .returning();
  if (!createdRun) throw new AgentWorkspaceError('Agent run을 생성하지 못했습니다.', 'RUN_CREATE_FAILED', 500);

  let sequence = 1;
  try {
    await appendRunEvent(db, {
      runId: createdRun.id,
      userId,
      sequence,
      eventType: 'run_queued',
      status: 'queued',
      metadata: { runType: input.runType },
    });
    sequence += 1;

    const [runningRun] = await db
      .update(agentRuns)
      .set({ status: 'running', startedAt: new Date() })
      .where(and(eq(agentRuns.id, createdRun.id), eq(agentRuns.userId, userId)))
      .returning();
    await appendRunEvent(db, {
      runId: createdRun.id,
      userId,
      sequence,
      eventType: 'run_started',
      status: 'running',
      metadata: { execution: 'local-only' },
    });
    sequence += 1;
    await db
      .update(agentToolStatus)
      .set({ lastRunAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(agentToolStatus.workspaceId, input.workspaceId),
          eq(agentToolStatus.userId, userId),
          eq(agentToolStatus.toolName, 'text-editor'),
        ),
      );
    await appendRunEvent(db, {
      runId: createdRun.id,
      userId,
      sequence,
      eventType: 'tool_status',
      status: 'available',
      toolName: 'text-editor',
      metadata: { execution: 'local-only' },
    });
    sequence += 1;

    const output = executeLocalTask({
      runType: input.runType,
      command: input.command,
      content,
      baseContent,
      targetContent: input.targetContent,
    });
    const artifactResult = await createArtifactVersion(db, userId, {
      workspaceId: input.workspaceId,
      artifactId: input.artifactId,
      artifactType: 'markdown',
      name: input.artifactName || `${output.title} 문서`,
      mimeType: 'text/markdown',
      content: output.content,
      createdByRunId: createdRun.id,
      metadata: { ...output.metadata, runType: input.runType, localOnly: true },
    });
    const [completedRun] = await db
      .update(agentRuns)
      .set({
        status: 'completed',
        outputHash: hashContent(output.content),
        completedAt: new Date(),
      })
      .where(and(eq(agentRuns.id, createdRun.id), eq(agentRuns.userId, userId)))
      .returning();
    await appendRunEvent(db, {
      runId: createdRun.id,
      userId,
      sequence,
      eventType: 'run_completed',
      status: 'completed',
      artifactVersionId: artifactResult.version.id,
      metadata: { artifactId: artifactResult.artifact.id, version: artifactResult.version.version },
    });
    return {
      run: completedRun || { ...runningRun, status: 'completed' as const },
      artifact: artifactResult.artifact,
      version: artifactResult.version,
    };
  } catch (error: unknown) {
    const failed = await markRunFailed(db, userId, createdRun.id, sequence, error);
    return {
      run: failed.run || { ...createdRun, status: 'failed' as const, errorCode: failed.code },
      artifact: null,
      version: null,
      error: { code: failed.code, message: failed.message },
    };
  }
}

export async function getAgentRunDetails(db: AgentDb, userId: string, runId: string) {
  const run = await findOwnedRun(db, userId, runId);
  if (!run) return null;
  const [events, feedback] = await Promise.all([
    db
      .select()
      .from(agentRunEvents)
      .where(and(eq(agentRunEvents.runId, runId), eq(agentRunEvents.userId, userId)))
      .orderBy(asc(agentRunEvents.sequence)),
    db
      .select()
      .from(agentFeedback)
      .where(and(eq(agentFeedback.runId, runId), eq(agentFeedback.userId, userId)))
      .orderBy(desc(agentFeedback.createdAt)),
  ]);
  const completedEvent = [...events].reverse().find((event) => event.artifactVersionId);
  let version = completedEvent?.artifactVersionId
    ? (await db
        .select()
        .from(agentArtifactVersions)
        .where(
          and(
            eq(agentArtifactVersions.id, completedEvent.artifactVersionId),
            eq(agentArtifactVersions.userId, userId),
          ),
        )
        .limit(1))[0]
    : undefined;
  let artifact = version ? await findOwnedArtifact(db, userId, version.artifactId, run.workspaceId) : undefined;
  if (!version && run.status === 'completed') {
    const [latestVersion] = await db
      .select()
      .from(agentArtifactVersions)
      .where(and(eq(agentArtifactVersions.createdByRunId, run.id), eq(agentArtifactVersions.userId, userId)))
      .orderBy(desc(agentArtifactVersions.createdAt))
      .limit(1);
    version = latestVersion;
    artifact = latestVersion ? await findOwnedArtifact(db, userId, latestVersion.artifactId, run.workspaceId) : undefined;
  }
  return { run, events, artifact: artifact || null, version: version || null, feedback };
}

export async function getArtifactVersionDetails(db: AgentDb, userId: string, artifactId: string, versionNumber: number) {
  const artifact = await findOwnedArtifact(db, userId, artifactId);
  if (!artifact) return null;
  const version = await findOwnedArtifactVersion(db, userId, artifactId, versionNumber);
  if (!version) return null;
  return { artifact, version };
}
