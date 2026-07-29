import { evaluateResumeForCompany } from 'server/services/company';
import { getDb } from 'db';
import { resumes, companyEvaluations } from 'db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { resumeId, companyId } = body || {};

  if (!resumeId || !companyId) {
    throw createError({ statusCode: 400, statusMessage: '이력서 ID와 기업 ID가 필요합니다.' });
  }

  const userId = event.context.user?.userId || '00000000-0000-0000-0000-000000000000';

  let resumeContent = '';

  try {
    const db = getDb();
    if (db) {
      const [resume] = await db.select().from(resumes).where(eq(resumes.id, resumeId));
      if (resume) {
        resumeContent = resume.originalContent;
      }
    }
  } catch {
    console.warn('[Kairos] DB fetch failed for resume evaluation');
  }

  if (!resumeContent) {
    resumeContent = 'Nuxt.js 및 TypeScript 기반 웹 서비스 구축 경력 4년. pgvector 시맨틱 검색 구현 경험.';
  }

  const result = await evaluateResumeForCompany(resumeContent, companyId);

  let savedRecord = null;
  try {
    const db = getDb();
    if (db) {
      const [record] = await db
        .insert(companyEvaluations)
        .values({
          userId,
          resumeId,
          companyId,
          matchScore: result.matchScore,
          breakdown: result.breakdown,
          strengths: result.strengths,
          gaps: result.gaps,
          recommendations: result.recommendations,
          aiSummary: result.aiSummary,
        })
        .returning();
      savedRecord = record;
    }
  } catch {
    console.warn('[Kairos] Evaluation save skipped (demo mode)');
  }

  return {
    success: true,
    evaluation: result,
    savedRecord,
  };
});
