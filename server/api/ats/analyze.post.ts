import { analyzeATSCompatibility } from 'server/services/ats';
import { getDb } from 'db';
import { atsAnalyses } from 'db/schema';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { jobTitle, jobDescription, resumeText, resumeId } = body || {};

  if (!jobTitle || !jobDescription || !resumeText) {
    throw createError({
      statusCode: 400,
      statusMessage: '직무명, 채용공고 본문, 이력서 텍스트가 모두 필요합니다.',
    });
  }

  const userId = event.context.user?.userId || '00000000-0000-0000-0000-000000000000';

  // Real LLM ATS Analysis call
  const analysis = await analyzeATSCompatibility(resumeText, jobDescription);

  // Save analysis record (graceful - skip if DB unavailable in demo mode)
  let savedId: string | undefined;
  try {
    const db = getDb();
    if (db) {
      const [saved] = await db
        .insert(atsAnalyses)
        .values({
          userId,
          jobTitle,
          jobDescription,
          resumeId: resumeId || null,
          matchScore: analysis.matchScore,
          missingKeywords: analysis.missingKeywords,
          foundKeywords: analysis.foundKeywords,
          recommendations: analysis.recommendations,
          detailedBreakdown: analysis.detailedBreakdown,
        })
        .returning();
      savedId = saved.id;
    }
  } catch {
    console.warn('[Kairos] ATS save skipped (demo mode - no DB)');
  }

  return {
    id: savedId || 'demo-ats-' + Date.now(),
    analysis,
  };
});
