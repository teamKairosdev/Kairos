import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import {
  agentRuns,
  agentWorkspaces,
  aiRoutingLogs,
  subagentTasks,
} from '@/db/schema';
import {
  agentRouter,
  type AgentRoute,
  type AgentTaskType,
} from '@/server/agentRouter';
import { analyzeATSCompatibility } from '@/server/ats';
import { callLLMText } from '@/server/llm';
import {
  hashValue,
  runIndependentSubtasks,
  type IndependentSubtask,
  type SubtaskStatusRecord,
} from '@/server/harness';
import { getSession } from '@/server/getSession';
import {
  badRequest,
  internalError,
  notFound,
  serviceUnavailable,
  unauthorized,
} from '@/server/http';

type Database = NonNullable<ReturnType<typeof getDb>>;

interface OrchestrationBody {
  taskType?: unknown;
  input?: unknown;
  workspaceId?: unknown;
  subtasks?: unknown;
}

interface RequestedSubtask {
  taskKey: string;
  agentRole: string;
  input: unknown;
  forceFailure: boolean;
}

interface OrchestrationTaskOutput {
  provider: 'gemini' | 'local-deterministic';
  taskType: AgentTaskType;
  output: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function inputText(input: unknown): string {
  if (typeof input === 'string') return input;
  if (!isRecord(input)) return '';

  for (const key of ['text', 'content', 'resumeText', 'answer', 'summary']) {
    if (typeof input[key] === 'string') return input[key];
  }
  return '';
}

function localDeterministicOutput(taskType: AgentTaskType, input: unknown): unknown {
  if (taskType === 'ats') {
    const value = isRecord(input) ? input : {};
    const resumeText = typeof value.resumeText === 'string' ? value.resumeText : '';
    const jobDescription = typeof value.jobDescription === 'string' ? value.jobDescription : '';
    if (!resumeText || !jobDescription) {
      throw new Error('ATS_INPUT_REQUIRED');
    }
    return analyzeATSCompatibility(resumeText, jobDescription);
  }

  if (taskType === 'rewrite') {
    const text = inputText(input).trim();
    if (!text) throw new Error('REWRITE_INPUT_REQUIRED');
    return {
      improvedContent: text,
      method: 'deterministic-preserve',
    };
  }

  if (taskType === 'interview') {
    const text = inputText(input).trim();
    if (!text) throw new Error('INTERVIEW_INPUT_REQUIRED');
    return {
      message: '답변을 기록했습니다. 다음 질문을 준비할 수 있습니다.',
      answerHash: hashValue(text),
    };
  }

  if (taskType === 'context-import') {
    const items = isRecord(input) && Array.isArray(input.items) ? input.items : [];
    return {
      itemCount: items.length,
      items: items.map((item) => ({ contentHash: hashValue(item) })),
    };
  }

  const text = inputText(input).trim();
  if (!text) throw new Error('SUMMARIZE_INPUT_REQUIRED');
  const words = text.split(/\s+/).filter(Boolean);
  return {
    summary: text.slice(0, 500),
    wordCount: words.length,
    truncated: text.length > 500,
  };
}

function buildGeminiPrompt(taskType: AgentTaskType, input: unknown): string {
  const serialized = JSON.stringify(input).slice(0, 12000);
  return [
    `Task type: ${taskType}`,
    'Return a concise result for the requested task.',
    `Input: ${serialized}`,
  ].join('\n');
}

function parseRequestedSubtasks(body: OrchestrationBody, rootInput: unknown): RequestedSubtask[] {
  if (body.subtasks === undefined) {
    return [{ taskKey: 'primary', agentRole: 'primary', input: rootInput, forceFailure: false }];
  }

  if (!Array.isArray(body.subtasks) || body.subtasks.length === 0 || body.subtasks.length > 32) {
    throw new Error('SUBTASKS_INVALID');
  }

  const keys = new Set<string>();
  return body.subtasks.map((raw, index) => {
    if (!isRecord(raw)) throw new Error(`SUBTASK_${index}_INVALID`);
    const taskKey = typeof raw.taskKey === 'string' ? raw.taskKey.trim() : `task-${index + 1}`;
    if (!taskKey || taskKey.length > 100 || keys.has(taskKey)) {
      throw new Error(`SUBTASK_${index}_KEY_INVALID`);
    }
    keys.add(taskKey);

    return {
      taskKey,
      agentRole:
        typeof raw.agentRole === 'string' && raw.agentRole.trim()
          ? raw.agentRole.trim().slice(0, 100)
          : taskKey,
      input: Object.prototype.hasOwnProperty.call(raw, 'input') ? raw.input : rootInput,
      forceFailure: raw.forceFailure === true || raw.shouldFail === true,
    };
  });
}

function publicTaskResult<T>(record: SubtaskStatusRecord<T>) {
  return {
    taskKey: record.taskKey,
    agentRole: record.agentRole,
    status: record.status,
    inputHash: record.inputHash,
    outputHash: record.outputHash ?? null,
    result: record.result ?? null,
    errorCode: record.errorCode ?? null,
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
  };
}

async function ensureWorkspace(
  db: Database,
  userId: string,
  requestedWorkspaceId: string | undefined,
): Promise<string> {
  if (requestedWorkspaceId) {
    const [ownedWorkspace] = await db
      .select({ id: agentWorkspaces.id })
      .from(agentWorkspaces)
      .where(and(eq(agentWorkspaces.id, requestedWorkspaceId), eq(agentWorkspaces.userId, userId)));
    if (!ownedWorkspace) throw new Error('WORKSPACE_NOT_FOUND');
    return ownedWorkspace.id;
  }

  const [existingWorkspace] = await db
    .select({ id: agentWorkspaces.id })
    .from(agentWorkspaces)
    .where(eq(agentWorkspaces.userId, userId))
    .orderBy(desc(agentWorkspaces.createdAt))
    .limit(1);
  if (existingWorkspace) return existingWorkspace.id;

  const [createdWorkspace] = await db
    .insert(agentWorkspaces)
    .values({
      userId,
      name: 'AI orchestration MVP',
      description: 'Deterministic orchestration workspace',
      status: 'active',
    })
    .returning({ id: agentWorkspaces.id });
  if (!createdWorkspace) throw new Error('WORKSPACE_CREATE_FAILED');
  return createdWorkspace.id;
}

async function executeRoutedTask(
  route: AgentRoute,
  rootInput: unknown,
): Promise<{ route: AgentRoute; sharedProviderOutput: string | null }> {
  if (route.provider !== 'gemini') {
    return { route, sharedProviderOutput: null };
  }

  try {
    const sharedProviderOutput = await callLLMText({
      model: route.model ?? undefined,
      prompt: buildGeminiPrompt(route.taskType, rootInput),
      temperature: 0.2,
    });
    return { route, sharedProviderOutput };
  } catch {
    return {
      route: {
        ...route,
        provider: 'local-deterministic',
        model: null,
        fallbackUsed: true,
      },
      sharedProviderOutput: null,
    };
  }
}

async function persistRun(
  db: Database,
  values: {
    userId: string;
    workspaceId: string;
    taskType: AgentTaskType;
    route: AgentRoute;
    requestHash: string;
    results: SubtaskStatusRecord<OrchestrationTaskOutput>[];
    startedAt: Date;
    completedAt: Date;
  },
): Promise<{ runId: string }> {
  const succeeded = values.results.filter((result) => result.status === 'succeeded').length;
  const failed = values.results.length - succeeded;
  const status = failed === 0 ? 'completed' : succeeded === 0 ? 'failed' : 'partial-failure';
  const outputHash = hashValue(
    values.results.map((result) => ({
      taskKey: result.taskKey,
      status: result.status,
      inputHash: result.inputHash,
      outputHash: result.outputHash ?? null,
      errorCode: result.errorCode ?? null,
    })),
  );

  const [run] = await db
    .insert(agentRuns)
    .values({
      userId: values.userId,
      workspaceId: values.workspaceId,
      runType: values.taskType,
      status,
      inputHash: values.requestHash,
      outputHash,
      errorCode: failed === 0 ? null : succeeded === 0 ? 'SUBTASK_FAILED' : 'SUBTASK_PARTIAL_FAILURE',
      metadata: {
        route: values.route.route,
        provider: values.route.provider,
        fallbackUsed: values.route.fallbackUsed,
        subtaskCount: values.results.length,
      },
      startedAt: values.startedAt,
      completedAt: values.completedAt,
    })
    .returning({ id: agentRuns.id });
  const runId = run?.id ?? randomUUID();

  await db.insert(aiRoutingLogs).values({
    userId: values.userId,
    runId,
    workspaceId: values.workspaceId,
    requestHash: values.requestHash,
    route: values.route.route,
    provider: values.route.provider,
    model: values.route.model,
    fallbackUsed: values.route.fallbackUsed,
    latencyMs: values.completedAt.getTime() - values.startedAt.getTime(),
    status,
    errorCode: failed === 0 ? null : 'SUBTASK_FAILURE',
  });

  await db.insert(subagentTasks).values(
    values.results.map((result) => ({
      runId,
      userId: values.userId,
      taskKey: result.taskKey,
      agentRole: result.agentRole,
      status: result.status,
      inputHash: result.inputHash,
      outputHash: result.outputHash ?? null,
      errorCode: result.errorCode ?? null,
      startedAt: result.startedAt ?? values.startedAt,
      completedAt: result.completedAt ?? values.completedAt,
      metadata: {},
    })),
  );

  return { runId };
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) return unauthorized();

  let body: OrchestrationBody;
  try {
    const parsed = await req.json();
    if (!isRecord(parsed)) return badRequest('요청 본문이 필요합니다.');
    body = parsed;
  } catch {
    return badRequest('유효한 JSON 요청이 필요합니다.');
  }

  if (typeof body.taskType !== 'string') return badRequest('taskType이 필요합니다.');

  let route: AgentRoute;
  let requestedSubtasks: RequestedSubtask[];
  try {
    route = agentRouter({ taskType: body.taskType });
    requestedSubtasks = parseRequestedSubtasks(body, body.input ?? {});
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : '오케스트레이션 요청이 올바르지 않습니다.');
  }

  const requestHash = hashValue({ taskType: route.taskType, input: body.input ?? {} });
  const startedAt = new Date();
  const routed = await executeRoutedTask(route, body.input ?? {});
  route = routed.route;

  const tasks: IndependentSubtask<unknown, OrchestrationTaskOutput>[] = requestedSubtasks.map((task) => ({
    taskKey: task.taskKey,
    agentRole: task.agentRole,
    input: task.input,
    execute: async (input) => {
      if (task.forceFailure) throw new Error('SUBTASK_FORCED_FAILURE');
      if (routed.sharedProviderOutput !== null) {
        return {
          provider: 'gemini',
          taskType: route.taskType,
          output: routed.sharedProviderOutput,
        };
      }
      return {
        provider: 'local-deterministic',
        taskType: route.taskType,
        output: localDeterministicOutput(route.taskType, input),
      };
    },
  }));

  const results = await runIndependentSubtasks(tasks);
  const completedAt = new Date();
  const db = getDb();
  let runId: string = randomUUID();
  let persisted = false;

  if (db) {
    try {
      const requestedWorkspaceId =
        typeof body.workspaceId === 'string' && body.workspaceId.trim()
          ? body.workspaceId.trim()
          : undefined;
      const workspaceId = await ensureWorkspace(db, session.userId, requestedWorkspaceId);
      ({ runId } = await persistRun(db, {
        userId: session.userId,
        workspaceId,
        taskType: route.taskType,
        route,
        requestHash,
        results,
        startedAt,
        completedAt,
      }));
      persisted = true;
    } catch (error) {
      return internalError(error, '오케스트레이션 결과를 저장하는 동안 오류가 발생했습니다.');
    }
  }

  const failedCount = results.filter((result) => result.status === 'failed').length;
  const successfulCount = results.length - failedCount;
  const status = failedCount === 0 ? 'completed' : successfulCount === 0 ? 'failed' : 'partial-failure';

  return NextResponse.json({
    run: {
      id: runId,
      status,
      inputHash: requestHash,
      outputHash: hashValue(
        results.map((result) => ({
          taskKey: result.taskKey,
          status: result.status,
          outputHash: result.outputHash ?? null,
        })),
      ),
    },
    route,
    tasks: results.map(publicTaskResult),
    partialFailure: failedCount > 0 && successfulCount > 0,
    persisted,
    demo: !db,
  });
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) return unauthorized();

  const db = getDb();
  if (!db) return serviceUnavailable('오케스트레이션 저장소를 사용할 수 없습니다.');

  const runId = req.nextUrl.searchParams.get('runId');
  try {
    if (runId) {
      const [run] = await db
        .select()
        .from(agentRuns)
        .where(and(eq(agentRuns.id, runId), eq(agentRuns.userId, session.userId)));
      if (!run) return notFound('Run not found');

      const tasks = await db
        .select()
        .from(subagentTasks)
        .where(and(eq(subagentTasks.runId, run.id), eq(subagentTasks.userId, session.userId)))
        .orderBy(desc(subagentTasks.createdAt));
      const routingLogs = await db
        .select()
        .from(aiRoutingLogs)
        .where(and(eq(aiRoutingLogs.runId, run.id), eq(aiRoutingLogs.userId, session.userId)))
        .orderBy(desc(aiRoutingLogs.createdAt));
      return NextResponse.json({ run, tasks, routingLogs });
    }

    const runs = await db
      .select()
      .from(agentRuns)
      .where(eq(agentRuns.userId, session.userId))
      .orderBy(desc(agentRuns.createdAt))
      .limit(50);
    return NextResponse.json({ runs });
  } catch (error) {
    return internalError(error, '오케스트레이션 기록을 조회하는 동안 오류가 발생했습니다.');
  }
}
