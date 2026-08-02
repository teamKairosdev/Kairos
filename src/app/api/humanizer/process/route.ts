import { NextRequest, NextResponse } from 'next/server';
import { processAIHumanizer } from '@/server/humanizer';
import { getDb } from '@/db';
import { humanizedTexts } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError } from '@/server/http';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { originalText } = body || {};

    if (!originalText || !originalText.trim()) {
      return badRequest('변환할 문장을 입력해 주세요.');
    }

    const session = await getSession(req);
    const userId = session?.userId || '00000000-0000-0000-0000-000000000000';

    const result = await processAIHumanizer(originalText);

    let saved: typeof humanizedTexts.$inferSelect | undefined;
    try {
      const db = getDb();
      if (db) {
        [saved] = await db
          .insert(humanizedTexts)
          .values({
            userId,
            originalText,
            humanizedText: result.humanizedText,
            styleScore: result.styleScore,
            changesSummary: result.changesSummary,
          })
          .returning();
      }
    } catch {
      console.warn('[Kairos] Humanizer save skipped (demo mode - no DB)');
    }

    return NextResponse.json({
      ...result,
      id: saved?.id || 'demo-hum-' + Date.now(),
      createdAt: (saved?.createdAt || new Date()).toISOString(),
    });
  } catch (err: unknown) {
    console.error('[/api/humanizer/process]', err);
    return internalError(err, 'Humanizer error');
  }
}
