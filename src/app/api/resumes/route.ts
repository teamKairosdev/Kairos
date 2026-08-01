import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import { getDb } from '@/db';
import { resumes } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json([], { status: 200 });

  const db = getDb();
  if (!db) return NextResponse.json([]);

  const list = await db
    .select()
    .from(resumes)
    .where(eq(resumes.userId, session.userId))
    .orderBy(desc(resumes.createdAt));

  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, originalContent } = body || {};

  if (!title || !originalContent) {
    return NextResponse.json({ error: '제목과 본문을 입력해주세요.' }, { status: 400 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });

  const [newResume] = await db
    .insert(resumes)
    .values({
      userId: session.userId,
      title,
      originalContent,
      status: 'draft',
      currentScore: 0,
    })
    .returning();

  return NextResponse.json(newResume);
}
