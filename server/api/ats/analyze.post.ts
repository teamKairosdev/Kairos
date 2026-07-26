import { analyzeATSCompatibility } from 'server/services/ats';
import { db } from 'db';
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

  // Save analysis record
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

  return {
    id: saved.id,
    analysis,
  };
});
