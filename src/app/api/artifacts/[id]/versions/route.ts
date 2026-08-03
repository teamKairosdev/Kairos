import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, serviceUnavailable, unauthorized } from '@/server/http';
import {
  AgentWorkspaceError,
  createArtifactVersion,
  findOwnedArtifact,
  getArtifactDetails,
} from '@/server/agentWorkspace';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const db = getDb();
    if (!db) return serviceUnavailable('Artifact DB를 사용할 수 없습니다.');
    const details = await getArtifactDetails(db, session.userId, id);
    if (!details) return NextResponse.json({ error: 'Artifact를 찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json({ versions: details.versions });
  } catch (error: unknown) {
    return internalError(error, 'Artifact version 목록을 불러오지 못했습니다.');
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body.content !== 'string') return badRequest('version content가 필요합니다.');
    const db = getDb();
    if (!db) return serviceUnavailable('Artifact DB를 사용할 수 없습니다.');
    const artifact = await findOwnedArtifact(db, session.userId, id);
    if (!artifact) return NextResponse.json({ error: 'Artifact를 찾을 수 없습니다.' }, { status: 404 });
    const result = await createArtifactVersion(db, session.userId, {
      workspaceId: artifact.workspaceId,
      artifactId: id,
      content: body.content,
      createdByRunId: typeof body.createdByRunId === 'string' ? body.createdByRunId : null,
      metadata: isRecord(body.metadata) ? body.metadata : { source: 'manual-edit' },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AgentWorkspaceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return internalError(error, 'Artifact version을 생성하지 못했습니다.');
  }
}
