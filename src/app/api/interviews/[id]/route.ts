import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { interviewMessages, mockInterviews } from '@/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { badRequest, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import { getSession } from '@/server/getSession';

function conflict(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 409 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(req);
  if (!session?.userId) return unauthorized('Unauthorized');

  const db = getDb();
  if (!db) return serviceUnavailable('면접 저장소를 사용할 수 없습니다.');

  const [item] = await db
    .select()
    .from(mockInterviews)
    .where(and(eq(mockInterviews.id, id), eq(mockInterviews.userId, session.userId)));
  if (!item) return notFound('Not found');

  const messages = await db
    .select({ sender: interviewMessages.sender, message: interviewMessages.message })
    .from(interviewMessages)
    .where(eq(interviewMessages.interviewId, id))
    .orderBy(asc(interviewMessages.createdAt));

  return NextResponse.json({
    ...item,
    messages: messages.map((message) => ({
      role: message.sender === 'candidate' ? 'user' : 'assistant',
      content: message.message,
    })),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(req);
  if (!session?.userId) return unauthorized('Unauthorized');

  const db = getDb();
  if (!db) return serviceUnavailable('면접 저장소를 사용할 수 없습니다.');

  const body = await req.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return badRequest('Invalid request body');
  }

  const [item] = await db
    .select()
    .from(mockInterviews)
    .where(and(eq(mockInterviews.id, id), eq(mockInterviews.userId, session.userId)));
  if (!item) return notFound('Not found');

  if (body.status !== undefined) {
    if (body.status !== 'completed') {
      return badRequest('Only in-progress interviews can be completed');
    }
    if (item.status !== 'in_progress') {
      return conflict('면접이 이미 종료되었습니다.');
    }
  }
  if (body.overallScore !== undefined && body.overallScore !== null &&
      (typeof body.overallScore !== 'number' || !Number.isInteger(body.overallScore) || body.overallScore < 0 || body.overallScore > 100)) {
    return badRequest('면접 점수가 올바르지 않습니다.');
  }
  if (body.overallFeedback !== undefined && body.overallFeedback !== null &&
      (typeof body.overallFeedback !== 'string' || body.overallFeedback.length > 20_000)) {
    return badRequest('면접 피드백이 올바르지 않습니다.');
  }

  const updateData: {
    status?: string;
    overallScore?: number | null;
    overallFeedback?: string | null;
  } = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.overallScore !== undefined) updateData.overallScore = body.overallScore;
  if (body.overallFeedback !== undefined) updateData.overallFeedback = body.overallFeedback;

  const where = body.status === 'completed'
    ? and(eq(mockInterviews.id, id), eq(mockInterviews.userId, session.userId), eq(mockInterviews.status, 'in_progress'))
    : and(eq(mockInterviews.id, id), eq(mockInterviews.userId, session.userId));

  const updated = await db
    .update(mockInterviews)
    .set({ ...updateData, updatedAt: new Date() })
    .where(where)
    .returning({ id: mockInterviews.id });

  if (!updated.length) {
    return body.status === 'completed' ? conflict('면접이 이미 종료되었습니다.') : notFound('Not found');
  }

  return NextResponse.json({ success: true });
}
