import { getDb } from 'db';
import { resumes } from 'db/schema';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { title, originalContent } = body || {};

  if (!title || !originalContent) {
    throw createError({ statusCode: 400, statusMessage: '제목과 이력서 본문을 입력해주세요.' });
  }

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
    const [newResume] = await db
      .insert(resumes)
      .values({ userId, title, originalContent, status: 'draft', currentScore: 50 })
      .returning();
    return newResume;
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || '이력서 등록 중 오류가 발생했습니다.',
    });
  }
});

