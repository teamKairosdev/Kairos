import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { careers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/server/getSession';
import { unauthorized, badRequest, notFound, serviceUnavailable, internalError } from '@/server/http';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return unauthorized();
    }

    const { id } = await params;
    if (!id) return badRequest('Career ID missing');

    const db = getDb();
    if (!db) {
      return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    }

    const deleted = await db
      .delete(careers)
      .where(and(eq(careers.id, id), eq(careers.userId, session.userId)))
      .returning();

    if (!deleted.length) {
      return notFound('경력 항목을 찾을 수 없거나 권한이 없습니다.');
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}
