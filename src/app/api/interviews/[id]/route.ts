import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { mockInterviews } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from '@/server/http';

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
