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

  const userId = event.context.user?.userId;
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: '로그인이 필요한 서비스입니다.',
    });
  }

  const db = getDb();
  if (!db) {
    throw createError({
      statusCode: 500,
      statusMessage: '데이터베이스 연결이 불가능합니다.',
    });
  }

  // Real LLM ATS Analysis call
  const analysis = await analyzeATSCompatibility(resumeText, jobDescription);

  try {
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
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'ATS 분석 결과를 저장하는 동안 오류가 발생했습니다.',
    });
  }
});
