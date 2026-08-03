import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, serviceUnavailable, unauthorized } from '@/server/http';
import { AgentWorkspaceError, createWorkspace, listWorkspaces } from '@/server/agentWorkspace';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const db = getDb();
    if (!db) return serviceUnavailable('워크스페이스 DB를 사용할 수 없습니다.');
    const workspaces = await listWorkspaces(db, session.userId);
    return NextResponse.json({ workspaces });
  } catch (error: unknown) {
    return internalError(error, '워크스페이스 목록을 불러오지 못했습니다.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const body = await req.json().catch(() => null) as { name?: unknown; description?: unknown } | null;
    if (!body || (body.name !== undefined && typeof body.name !== 'string') || (body.description !== undefined && typeof body.description !== 'string')) {
      return badRequest('워크스페이스 이름과 설명 형식이 올바르지 않습니다.');
    }
    const db = getDb();
    if (!db) return serviceUnavailable('워크스페이스 DB를 사용할 수 없습니다.');
    const workspace = await createWorkspace(db, session.userId, {
      name: body.name,
      description: body.description,
    });
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AgentWorkspaceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return internalError(error, '워크스페이스를 생성하지 못했습니다.');
  }
}
