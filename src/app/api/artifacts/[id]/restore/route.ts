import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, serviceUnavailable, unauthorized } from '@/server/http';
import { AgentWorkspaceError, restoreArtifactVersion } from '@/server/agentWorkspace';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const body = await req.json().catch(() => null) as { version?: unknown } | null;
    const version = typeof body?.version === 'number' ? body.version : Number(body?.version);
    if (!Number.isInteger(version) || version < 1) return badRequest('복원할 version 값이 올바르지 않습니다.');
    const db = getDb();
    if (!db) return serviceUnavailable('Artifact DB를 사용할 수 없습니다.');
    const result = await restoreArtifactVersion(db, session.userId, id, version);
    return NextResponse.json({ ...result, restoredFromVersion: version }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AgentWorkspaceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return internalError(error, 'Artifact version을 복원하지 못했습니다.');
  }
}
