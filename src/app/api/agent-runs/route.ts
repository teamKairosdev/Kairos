import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import {
  AgentWorkspaceError,
  executeAgentRun,
  findOwnedWorkspace,
  getAgentRunDetails,
  normalizeRunType,
  listRuns,
  type AgentRunType,
} from '@/server/agentWorkspace';

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const workspaceId = req.nextUrl.searchParams.get('workspaceId') || undefined;
    const db = getDb();
    if (!db) return serviceUnavailable('Agent run DB를 사용할 수 없습니다.');
    if (workspaceId && !(await findOwnedWorkspace(db, session.userId, workspaceId))) {
      return notFound('워크스페이스를 찾을 수 없습니다.');
    }
    const runs = await listRuns(db, session.userId, workspaceId);
    return NextResponse.json({ runs });
  } catch (error: unknown) {
    return internalError(error, 'Agent run 목록을 불러오지 못했습니다.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return badRequest('실행 요청 형식이 올바르지 않습니다.');

    const runType = normalizeRunType(body.runType ?? body.type);
    const command = stringValue(body.command ?? body.prompt)?.trim();
    const workspaceId = stringValue(body.workspaceId);
    if (!runType || !workspaceId || !command) {
      return badRequest('workspaceId, command, runType(draft|rewrite|summarize|diff)가 필요합니다.');
    }

    const db = getDb();
    if (!db) return serviceUnavailable('Agent run DB를 사용할 수 없습니다.');
    const result = await executeAgentRun(db, session.userId, {
      workspaceId,
      runType: runType as AgentRunType,
      command,
      content: stringValue(body.content ?? body.input ?? body.sourceContent),
      baseContent: stringValue(body.baseContent ?? body.before),
      targetContent: stringValue(body.targetContent ?? body.after),
      artifactId: stringValue(body.artifactId),
      artifactName: stringValue(body.artifactName),
    });
    const details = await getAgentRunDetails(db, session.userId, result.run.id);
    return NextResponse.json(
      { ...(details || result), error: result.error },
      { status: result.error ? 422 : 201 },
    );
  } catch (error: unknown) {
    if (error instanceof AgentWorkspaceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return internalError(error, 'Agent run을 생성하지 못했습니다.');
  }
}
