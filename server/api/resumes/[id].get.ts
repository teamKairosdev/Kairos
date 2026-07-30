import { getDb } from 'db';
import { resumes, resumeRefinements } from 'db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: '이력서 ID가 필요합니다.' });

  const db = getDb();
  if (!db) {
    throw createError({
      statusCode: 500,
      statusMessage: '데이터베이스 연결이 불가능합니다.',
    });
  }

  let resume = null;
  let refinements: Array<{ id: string; resumeId: string; step: string; draftContent: string; evaluationFeedback: unknown; score: number; improvedContent: string | null; createdAt: Date }> = [];

  try {
    const [res] = await db.select().from(resumes).where(eq(resumes.id, id));
    resume = res;

    if (resume) {
      refinements = await db
        .select()
        .from(resumeRefinements)
        .where(eq(resumeRefinements.resumeId, id));
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || '데이터베이스에서 정보를 조회하는 동안 에러가 발생했습니다.',
    });
  }

  if (!resume) {
    throw createError({
      statusCode: 404,
      statusMessage: '존재하지 않거나 삭제된 이력서입니다.',
    });
  }

  return {
    resume,
    refinementHistory: refinements,
  };
});

