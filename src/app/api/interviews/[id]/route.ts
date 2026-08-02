import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { mockInterviews } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound, unauthorized } from '@/server/http';
import { getSession } from '@/server/getSession';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });

  const [item] = await db.select().from(mockInterviews).where(eq(mockInterviews.id, id));
  if (!item) return notFound('Not found');

  return NextResponse.json(item);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(req);
  if (!session) return unauthorized('Unauthorized');

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });

  const [item] = await db.select().from(mockInterviews).where(eq(mockInterviews.id, id));
  if (!item) return notFound('Not found');
  if (item.userId !== session.userId) {
    return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
  }

  const body = await req.json();
  const updateData: {
    status?: string;
    overallScore?: number | null;
    overallFeedback?: string | null;
  } = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.overallScore !== undefined) updateData.overallScore = body.overallScore;
  if (body.overallFeedback !== undefined) updateData.overallFeedback = body.overallFeedback;

  await db
    .update(mockInterviews)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(mockInterviews.id, id));

  return NextResponse.json({ success: true });
}
