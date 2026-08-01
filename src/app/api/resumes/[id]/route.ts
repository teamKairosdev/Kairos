import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import { getDb } from '@/../db';
import { resumes, resumeRefinements } from '@/../db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });

  const [resume] = await db.select().from(resumes).where(eq(resumes.id, id));
  if (!resume) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });

  const history = await db
    .select()
    .from(resumeRefinements)
    .where(eq(resumeRefinements.resumeId, id))
    .orderBy(desc(resumeRefinements.createdAt));

  return NextResponse.json({ resume, refinementHistory: history });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });

  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.originalContent !== undefined) updateData.originalContent = body.originalContent;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.currentScore !== undefined) updateData.currentScore = body.currentScore;

  await db.update(resumes).set(updateData).where(eq(resumes.id, id));

  return NextResponse.json({ success: true });
}
