import { getDb } from 'db';
import { companyEvaluations } from 'db/schema';
import { eq, and, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const resumeId = query.resumeId as string;

  if (!resumeId) {
    throw createError({ statusCode: 400, statusMessage: 'resumeId가 필요합니다.' });
  }

  const userId = event.context.user?.userId || '00000000-0000-0000-0000-000000000000';

  try {
    const db = getDb();
    if (db) {
      const results = await db
        .select()
        .from(companyEvaluations)
        .where(and(eq(companyEvaluations.resumeId, resumeId), eq(companyEvaluations.userId, userId)))
        .orderBy(desc(companyEvaluations.createdAt));
      return results;
    }
  } catch {
    console.warn('[Kairos] companies/results.get.ts DB fetch failed (demo mode)');
  }

  return [];
});
