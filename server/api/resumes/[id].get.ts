import { getDb } from 'db';
import { resumes, resumeRefinements } from 'db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: '이력서 ID가 필요합니다.' });

  let resume = null;
  let refinements: any[] = [];

  try {
    const db = getDb();
    if (db) {
      const [res] = await db.select().from(resumes).where(eq(resumes.id, id));
      resume = res;

      if (resume) {
        refinements = await db
          .select()
          .from(resumeRefinements)
          .where(eq(resumeRefinements.resumeId, id));
      }
    }
  } catch {
    console.warn('[Kairos] resume.get.ts DB fetch skipped (demo mode)');
  }

  if (!resume) {
    // Fallback demo object if not found in db
    return {
      resume: {
        id,
        title: '시니어 풀스택 개발자 이력서',
        originalContent: 'Nuxt.js 및 TypeScript 기반 웹 서비스 경험 보유...',
        status: 'improved',
        currentScore: 94,
        createdAt: new Date(),
      },
      refinementHistory: [],
    };
  }

  return {
    resume,
    refinementHistory: refinements,
  };
});

