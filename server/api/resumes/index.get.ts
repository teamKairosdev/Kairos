import { getDb } from 'db';
import { resumes } from 'db/schema';
import { eq, desc } from 'drizzle-orm';

const MOCK_RESUMES = [
  {
    id: 'demo-resume-1',
    title: '시니어 풀스택 개발자 이력서 초안',
    originalContent: 'Nuxt.js 및 Node.js 기반 웹 서비스 구축 경력 4년...',
    status: 'improved',
    currentScore: 92,
    createdAt: new Date(),
  }
];

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId;
  
  if (!userId) {
    // Return sample demo data if not logged in
    return MOCK_RESUMES;
  }

  try {
    const db = getDb();
    if (db) {
      const list = await db
        .select()
        .from(resumes)
        .where(eq(resumes.userId, userId))
        .orderBy(desc(resumes.createdAt));
      return list;
    }
  } catch {
    console.warn('[Kairos] resumes/index.get.ts DB fetch failed (demo mode)');
  }

  return MOCK_RESUMES;
});

