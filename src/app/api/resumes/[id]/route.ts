import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import { getDb } from '@/db';
import { resumes, resumeRefinements } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { badRequest, unauthorized, notFound, serviceUnavailable } from '@/server/http';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(req);
  if (!session) return unauthorized('Unauthorized');

  const db = getDb();
  if (!db) return serviceUnavailable('이력서 저장소를 사용할 수 없습니다.');

  const [resume] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, session.userId)));
  if (!resume) return notFound('Resume not found');

  const history = await db
    .select()
    .from(resumeRefinements)
    .where(eq(resumeRefinements.resumeId, resume.id))
    .orderBy(desc(resumeRefinements.createdAt));

  return NextResponse.json({ resume, refinementHistory: history });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(req);
  if (!session) return unauthorized('Unauthorized');

  const body = await req.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) return badRequest('요청 본문이 올바르지 않습니다.');
  const db = getDb();
  if (!db) return serviceUnavailable('이력서 저장소를 사용할 수 없습니다.');

  const updateData: Partial<typeof resumes.$inferInsert> = { updatedAt: new Date() };
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 255) return badRequest('이력서 제목이 올바르지 않습니다.');
    updateData.title = body.title.trim();
  }
  if (body.originalContent !== undefined) {
    if (typeof body.originalContent !== 'string' || !body.originalContent.trim() || body.originalContent.length > 100_000) return badRequest('이력서 본문이 올바르지 않습니다.');
    updateData.originalContent = body.originalContent.trim();
  }
  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !['draft', 'evaluating', 'improved'].includes(body.status)) return badRequest('이력서 상태가 올바르지 않습니다.');
    updateData.status = body.status;
  }
  if (body.currentScore !== undefined) {
    if (typeof body.currentScore !== 'number' || !Number.isInteger(body.currentScore) || body.currentScore < 0 || body.currentScore > 100) return badRequest('이력서 점수가 올바르지 않습니다.');
    updateData.currentScore = body.currentScore;
  }

  const updated = await db
    .update(resumes)
    .set(updateData)
    .where(and(eq(resumes.id, id), eq(resumes.userId, session.userId)))
    .returning({ id: resumes.id });

  if (!updated.length) return notFound('Resume not found');

  return NextResponse.json({ success: true });
}
