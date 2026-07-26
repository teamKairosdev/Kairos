import { getDb } from 'db';
import { resumes } from 'db/schema';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { title, originalContent } = body || {};

  if (!title || !originalContent) {
    throw createError({ statusCode: 400, statusMessage: '제목과 이력서 본문을 입력해주세요.' });
  }

  const userId = event.context.user?.userId || '00000000-0000-0000-0000-000000000000';

  // Save to DB (graceful in demo mode)
  try {
    const db = getDb();
    if (db) {
      const [newResume] = await db
        .insert(resumes)
        .values({ userId, title, originalContent, status: 'draft', currentScore: 50 })
        .returning();
      return newResume;
    }
  } catch {
    console.warn('[Kairos] Resume save skipped (demo mode - no DB)');
  }

  // Demo mode: return mock saved resume
  return {
    id: 'demo-resume-' + Date.now(),
    userId,
    title,
    originalContent,
    status: 'draft',
    currentScore: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
});

