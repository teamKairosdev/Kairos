import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { qaSets } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSession } from '@/server/getSession';
import { unauthorized, internalError } from '@/server/http';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return unauthorized();
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json([]);
    }

    const result = await db
      .select({
        id: qaSets.id,
        title: qaSets.title,
        targetRole: qaSets.targetRole,
        qaPairs: qaSets.qaPairs,
        createdAt: qaSets.createdAt,
      })
      .from(qaSets)
      .where(eq(qaSets.userId, session.userId))
      .orderBy(desc(qaSets.createdAt))
      .limit(50);

    return NextResponse.json(result);
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}
