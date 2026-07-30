import { getDb } from 'db';
import { careers } from 'db/schema';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' });
  }

  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Career ID missing' });

  const db = getDb();
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: '데이터베이스에 연결할 수 없습니다.' });
  }

  const deleted = await db
    .delete(careers)
    .where(and(eq(careers.id, id), eq(careers.userId, userId)))
    .returning();

  if (!deleted.length) {
    throw createError({ statusCode: 404, statusMessage: '경력 항목을 찾을 수 없거나 권한이 없습니다.' });
  }

  return { success: true };
});
