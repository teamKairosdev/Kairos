import { getDb } from 'db';
import { mockInterviews } from 'db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' });
  }

  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Interview ID missing' });

  const db = getDb();
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: '데이터베이스에 연결할 수 없습니다.' });
  }

  const [session] = await db
    .select()
    .from(mockInterviews)
    .where(eq(mockInterviews.id, id));

  if (!session) {
    throw createError({ statusCode: 404, statusMessage: '면접 세션을 찾을 수 없습니다.' });
  }

  if (session.userId !== userId) {
    throw createError({ statusCode: 403, statusMessage: '접근 권한이 없습니다.' });
  }

  return session;
});
