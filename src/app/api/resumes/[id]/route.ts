import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import { getDb } from '@/db';
import { resumes, resumeRefinements } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { unauthorized, notFound } from '@/server/http';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(req);
  if (!session) return unauthorized('Unauthorized');

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });

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
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });

  const updateData: Partial<typeof resumes.$inferInsert> = { updatedAt: new Date() };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.originalContent !== undefined) updateData.originalContent = body.originalContent;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.currentScore !== undefined) updateData.currentScore = body.currentScore;

  const updated = await db
    .update(resumes)
    .set(updateData)
    .where(and(eq(resumes.id, id), eq(resumes.userId, session.userId)))
    .returning({ id: resumes.id });

  if (!updated.length) return notFound('Resume not found');

  return NextResponse.json({ success: true });
}
