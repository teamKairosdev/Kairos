import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getSession } from '@/server/getSession';
import { internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import { getAgentRunDetails } from '@/server/agentWorkspace';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const db = getDb();
    if (!db) return serviceUnavailable('Agent run DB를 사용할 수 없습니다.');
    const details = await getAgentRunDetails(db, session.userId, id);
    if (!details) return notFound('Agent run을 찾을 수 없습니다.');
    return NextResponse.json(details);
  } catch (error: unknown) {
    return internalError(error, 'Agent run을 불러오지 못했습니다.');
  }
}
