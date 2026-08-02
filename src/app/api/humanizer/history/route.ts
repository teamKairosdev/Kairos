import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { humanizedTexts } from '@/db/schema';
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
        id: humanizedTexts.id,
        originalText: humanizedTexts.originalText,
        humanizedText: humanizedTexts.humanizedText,
        styleScore: humanizedTexts.styleScore,
        createdAt: humanizedTexts.createdAt,
      })
      .from(humanizedTexts)
      .where(eq(humanizedTexts.userId, session.userId))
      .orderBy(desc(humanizedTexts.createdAt))
      .limit(20);

    return NextResponse.json(result);
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}
