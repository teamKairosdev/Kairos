import { getDb } from 'db';
import { resumes } from 'db/schema';
import { eq, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId;
  
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: '로그인이 필요한 서비스입니다.',
    });
  }

  const db = getDb();
  if (!db) {
    throw createError({
      statusCode: 500,
      statusMessage: '데이터베이스 연결이 불가능합니다.',
    });
  }

  try {
    const list = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(desc(resumes.createdAt));
    return list;
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || '이력서 목록을 조회하는 동안 오류가 발생했습니다.',
    });
  }
});

