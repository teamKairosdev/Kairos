import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import { AgentWorkspaceError, createArtifactVersion, findOwnedWorkspace, listArtifacts } from '@/server/agentWorkspace';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const workspaceId = req.nextUrl.searchParams.get('workspaceId') || undefined;
    const db = getDb();
    if (!db) return serviceUnavailable('Artifact DB를 사용할 수 없습니다.');
    if (workspaceId && !(await findOwnedWorkspace(db, session.userId, workspaceId))) {
      return notFound('워크스페이스를 찾을 수 없습니다.');
    }
    const artifacts = await listArtifacts(db, session.userId, workspaceId);
    return NextResponse.json({ artifacts });
  } catch (error: unknown) {
    return internalError(error, 'Artifact 목록을 불러오지 못했습니다.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body.workspaceId !== 'string' || typeof body.content !== 'string') {
      return badRequest('workspaceId와 content가 필요합니다.');
    }
    const db = getDb();
    if (!db) return serviceUnavailable('Artifact DB를 사용할 수 없습니다.');
    const result = await createArtifactVersion(db, session.userId, {
      workspaceId: body.workspaceId,
      artifactType: typeof body.artifactType === 'string' ? body.artifactType : 'markdown',
      name: typeof body.name === 'string' ? body.name : 'Canvas 결과',
      mimeType: typeof body.mimeType === 'string' ? body.mimeType : 'text/markdown',
      content: body.content,
      metadata: typeof body.metadata === 'object' && body.metadata !== null && !Array.isArray(body.metadata)
        ? body.metadata as Record<string, unknown>
        : { source: 'manual-create' },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AgentWorkspaceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return internalError(error, 'Artifact를 생성하지 못했습니다.');
  }
}
