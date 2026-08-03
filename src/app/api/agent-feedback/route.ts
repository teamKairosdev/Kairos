import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { agentFeedback, agentRuns } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { and, desc, eq } from 'drizzle-orm';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const runId = req.nextUrl.searchParams.get('runId') || undefined;
    const db = getDb();
    if (!db) return serviceUnavailable('Feedback DB를 사용할 수 없습니다.');
    if (runId) {
      const [ownedRun] = await db
        .select({ id: agentRuns.id })
        .from(agentRuns)
        .where(and(eq(agentRuns.id, runId), eq(agentRuns.userId, session.userId)));
      if (!ownedRun) return notFound('Agent run을 찾을 수 없습니다.');
    }
    const conditions = [eq(agentFeedback.userId, session.userId)];
    if (runId) conditions.push(eq(agentFeedback.runId, runId));
    const feedback = await db
      .select()
      .from(agentFeedback)
      .where(and(...conditions))
      .orderBy(desc(agentFeedback.createdAt))
      .limit(100);
    return NextResponse.json({ feedback });
  } catch (error: unknown) {
    return internalError(error, 'Feedback를 불러오지 못했습니다.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return badRequest('Feedback 요청 형식이 올바르지 않습니다.');

    const feedbackType = typeof (body.feedbackType ?? body.type) === 'string'
      ? String(body.feedbackType ?? body.type).trim()
      : '';
    const comment = body.comment === undefined || body.comment === null ? null : body.comment;
    const runId = body.runId === undefined || body.runId === null ? null : body.runId;
    const rating = body.rating === undefined || body.rating === null ? null : body.rating;
    if (!feedbackType || feedbackType.length > 50) return badRequest('feedback type을 입력해주세요.');
    if (comment !== null && typeof comment !== 'string') return badRequest('comment 형식이 올바르지 않습니다.');
    if (typeof comment === 'string' && comment.length > 4000) return badRequest('comment는 4000자 이하로 입력해주세요.');
    if (rating !== null && (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return badRequest('rating은 1에서 5 사이의 정수여야 합니다.');
    }
    if (runId !== null && typeof runId !== 'string') return badRequest('runId 형식이 올바르지 않습니다.');

    const db = getDb();
    if (!db) return serviceUnavailable('Feedback DB를 사용할 수 없습니다.');
    if (runId) {
      const [ownedRun] = await db
        .select({ id: agentRuns.id })
        .from(agentRuns)
        .where(and(eq(agentRuns.id, runId), eq(agentRuns.userId, session.userId)));
      if (!ownedRun) return notFound('Agent run을 찾을 수 없습니다.');
    }
    const [feedback] = await db
      .insert(agentFeedback)
      .values({
        userId: session.userId,
        runId,
        rating,
        feedbackType,
        comment,
        metadata: isRecord(body.metadata) ? body.metadata : {},
      })
      .returning();
    if (!feedback) return NextResponse.json({ error: 'Feedback을 저장하지 못했습니다.' }, { status: 500 });
    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error: unknown) {
    return internalError(error, 'Feedback을 저장하지 못했습니다.');
  }
}
