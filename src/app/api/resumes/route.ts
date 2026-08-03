import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import { getDb } from '@/db';
import { resumes } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { unauthorized, badRequest, serviceUnavailable } from '@/server/http';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) return unauthorized();

  const db = getDb();
  if (!db) return serviceUnavailable('이력서 저장소를 사용할 수 없습니다.');

  const list = await db
    .select()
    .from(resumes)
    .where(eq(resumes.userId, session.userId))
    .orderBy(desc(resumes.createdAt));

  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return unauthorized('Unauthorized');

  const body = await req.json();
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const originalContent = typeof body?.originalContent === 'string' ? body.originalContent.trim() : '';

  if (!title || !originalContent) {
    return badRequest('제목과 본문을 입력해주세요.');
  }
  if (title.length > 255 || originalContent.length > 100_000) {
    return badRequest('이력서 제목 또는 본문이 허용된 길이를 초과했습니다.');
  }

  const db = getDb();
  if (!db) return serviceUnavailable('이력서 저장소를 사용할 수 없습니다.');

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
