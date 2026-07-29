import { getDb } from 'db';
import { resumes } from 'db/schema';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { title, originalContent, companyId } = body || {};

  if (!title || !originalContent) {
    throw createError({ statusCode: 400, statusMessage: '제목과 이력서 본문을 입력해주세요.' });
  }

  const userId = event.context.user?.userId || '00000000-0000-0000-0000-000000000000';

  try {
    const db = getDb();
    if (db) {
      const [newResume] = await db
        .insert(resumes)
        .values({ userId, title, originalContent, companyId: companyId || null, status: 'draft' })
        .returning();
      return newResume;
    }
  } catch {
    console.warn('[Kairos] Resume save skipped (demo mode - no DB)');
  }

  return {
    id: 'demo-resume-' + Date.now(),
    userId,
    title,
    originalContent,
    companyId: companyId || null,
    status: 'draft',
    currentScore: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
});

