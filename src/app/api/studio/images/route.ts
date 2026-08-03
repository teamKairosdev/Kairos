import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getSession } from '@/server/getSession';
import { internalError, serviceUnavailable, unauthorized } from '@/server/http';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return unauthorized();
    }

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    const { studioImages: si } = await import('@/db/schema');
    const { eq, desc } = await import('drizzle-orm');
    const images = await db
      .select()
      .from(si)
      .where(eq(si.userId, session.userId))
      .orderBy(desc(si.createdAt))
      .limit(50);

    return NextResponse.json({ images });
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}
