import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import {
  AgentWorkspaceError,
  getArtifactVersionDetails,
  restoreArtifactVersion,
} from '@/server/agentWorkspace';

function parseVersion(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> },
) {
  try {
    const { id, version: rawVersion } = await params;
    const version = parseVersion(rawVersion);
    if (!version) return badRequest('version 값이 올바르지 않습니다.');
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const db = getDb();
    if (!db) return serviceUnavailable('Artifact DB를 사용할 수 없습니다.');
    const details = await getArtifactVersionDetails(db, session.userId, id, version);
    if (!details) return notFound('Artifact version을 찾을 수 없습니다.');
    return NextResponse.json(details);
  } catch (error: unknown) {
    return internalError(error, 'Artifact version을 불러오지 못했습니다.');
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> },
) {
  try {
    const { id, version: rawVersion } = await params;
    const version = parseVersion(rawVersion);
    if (!version) return badRequest('version 값이 올바르지 않습니다.');
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
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
