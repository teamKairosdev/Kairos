import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import { getDb } from '@/db';
import { mockInterviews } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json([], { status: 200 });

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
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { jobTitle, companyName, difficulty } = body || {};

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });

  const [newSession] = await db
    .insert(mockInterviews)
    .values({
      userId: session.userId,
      jobTitle: jobTitle || '기술 면접',
      companyName: companyName || '일반 기업',
      difficulty: difficulty || 'medium',
      status: 'in_progress',
    })
    .returning();

  return NextResponse.json({ session: newSession });
}
