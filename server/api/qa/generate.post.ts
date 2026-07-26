import { generateQASet } from 'server/services/qa';
import { getDb } from 'db';
import { qaSets } from 'db/schema';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { targetRole, careerSummary, count = 5 } = body || {};

  if (!targetRole || !careerSummary) {
    throw createError({ statusCode: 400, statusMessage: '목표 직무와 경력 요약 텍스트를 입력해주세요.' });
  }

  const userId = event.context.user?.userId || '00000000-0000-0000-0000-000000000000';

  const qaResult = await generateQASet(targetRole, careerSummary, count);

  // Save result (graceful - skip if DB unavailable in demo mode)
  let savedId: string | undefined;
  try {
    const db = getDb();
    if (db) {
      const [saved] = await db
        .insert(qaSets)
        .values({
          userId,
          title: `${targetRole} 예상 면접 Q&A 세트`,
          targetRole,
          qaPairs: qaResult.qaPairs,
        })
        .returning();
      savedId = saved.id;
    }
  } catch {
    console.warn('[Kairos] QA save skipped (demo mode - no DB)');
  }

  return {
    id: savedId || 'demo-qa-' + Date.now(),
    qaSet: qaResult,
  };
});

