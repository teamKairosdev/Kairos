import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import { getDb } from '@/db';
import { interviewMessages, mockInterviews } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { unauthorized } from '@/server/http';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) return unauthorized();

  const db = getDb();
  if (!db) return NextResponse.json([]);

  const list = await db
    .select()
    .from(mockInterviews)
    .where(eq(mockInterviews.userId, session.userId))
    .orderBy(desc(mockInterviews.createdAt));

  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return unauthorized('Unauthorized');

  const body = await req.json();
  const { jobTitle, companyName, difficulty } = body || {};

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });

  let newSession: typeof mockInterviews.$inferSelect | undefined;
  try {
    [newSession] = await db
      .insert(mockInterviews)
      .values({
        userId: session.userId,
        jobTitle: jobTitle || '기술 면접',
        companyName: companyName || '일반 기업',
        difficulty: difficulty || 'medium',
        status: 'in_progress',
      })
      .returning();

    await db.insert(interviewMessages).values({
      interviewId: newSession.id,
      sender: 'interviewer',
      message: `안녕하세요. ${newSession.companyName || '회사'}의 ${newSession.jobTitle} 직무 면접에 지원해주셔서 감사합니다. 먼저 준비하신 자기소개 부탁드립니다.`,
    });
  } catch (error) {
    if (newSession) {
      try {
        await db
          .delete(mockInterviews)
          .where(and(eq(mockInterviews.id, newSession.id), eq(mockInterviews.userId, session.userId)));
      } catch {
        // Preserve the original insert failure if cleanup also fails.
      }
    }
    throw error;
  }

  return NextResponse.json({ session: newSession });
}
