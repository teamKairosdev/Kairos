import { processAIHumanizer } from 'server/services/humanizer';
import { db } from 'db';
import { humanizedTexts } from 'db/schema';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { originalText } = body || {};

  if (!originalText || originalText.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: '변환할 문장을 입력해 주세요.' });
  }

  const userId = event.context.user?.userId || '00000000-0000-0000-0000-000000000000';

  const result = await processAIHumanizer(originalText);

  await db.insert(humanizedTexts).values({
    userId,
    originalText,
    humanizedText: result.humanizedText,
    styleScore: result.styleScore,
    changesSummary: result.changesSummary,
  });

  return result;
});
