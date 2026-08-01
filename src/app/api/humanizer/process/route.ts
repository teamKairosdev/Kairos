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

    try {
      const db = getDb();
      if (db) {
        await db.insert(humanizedTexts).values({
          userId,
          originalText,
          humanizedText: result.humanizedText,
          styleScore: result.styleScore,
          changesSummary: result.changesSummary,
        });
      }
    } catch {
      console.warn('[Kairos] Humanizer save skipped (demo mode - no DB)');
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[/api/humanizer/process]', err);
    return internalError(err, 'Humanizer error');
  }
}
