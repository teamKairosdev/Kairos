import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getSession } from '@/server/getSession';
import { unauthorized, internalError } from '@/server/http';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return unauthorized();
    }

    const db = getDb();
    if (!db) return NextResponse.json({ images: [] });

    const { studioImages: si } = await import('@/db/schema');
    const { eq, desc } = await import('drizzle-orm');
    const images = await db
      .select()
      .from(si)
      .where(eq(si.userId, session.userId))
      .orderBy(desc(si.createdAt))
      .limit(50);

    return NextResponse.json({ images });
  } catch (err: any) {
    return internalError(err, 'Error');
  }
}
