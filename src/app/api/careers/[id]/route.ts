import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { careers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/server/getSession';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Career ID missing' }, { status: 400 });

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: '데이터베이스에 연결할 수 없습니다.' }, { status: 503 });
    }

    const deleted = await db
      .delete(careers)
      .where(and(eq(careers.id, id), eq(careers.userId, session.userId)))
      .returning();

    if (!deleted.length) {
      return NextResponse.json(
        { error: '경력 항목을 찾을 수 없거나 권한이 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}
