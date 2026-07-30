import { getDb } from 'db';
import { mockInterviews } from 'db/schema';
import { eq, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId;

  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' });
  }

  const db = getDb();
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: '데이터베이스에 연결할 수 없습니다.' });
  }

  const sessions = await db
    .select()
    .from(mockInterviews)
    .where(eq(mockInterviews.userId, userId))
    .orderBy(desc(mockInterviews.createdAt));

  return sessions;
});
