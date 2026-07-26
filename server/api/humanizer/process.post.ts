import { processAIHumanizer } from 'server/services/humanizer';
import { getDb } from 'db';
import { humanizedTexts } from 'db/schema';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { originalText } = body || {};

  if (!originalText || originalText.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: '변환할 문장을 입력해 주세요.' });
  }

  const userId = event.context.user?.userId || '00000000-0000-0000-0000-000000000000';

  const result = await processAIHumanizer(originalText);

  // Save result (graceful - skip if DB unavailable in demo mode)
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

  return result;
});

