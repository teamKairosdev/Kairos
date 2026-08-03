import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getSession } from '@/server/getSession';
import { internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import { completeOwnedMentorTask } from '@/server/mentor';

async function complete(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    const result = await completeOwnedMentorTask(db, session.userId, id);
    if (!result) return notFound('과제를 찾을 수 없습니다.');
    return NextResponse.json({
      task: result.task,
      growthEvent: result.event ?? null,
    });
  } catch (error: unknown) {
    return internalError(error, '과제를 완료 처리하지 못했습니다.');
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return complete(req, context);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return complete(req, context);
}
