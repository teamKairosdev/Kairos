import { getDb } from 'db';
import { resumes } from 'db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: '이력서 ID가 누락되었습니다.',
    });
  }

  const body = await readBody(event);
  const { title, originalContent } = body || {};

  if (!title || !originalContent) {
    throw createError({
      statusCode: 400,
      statusMessage: '제목과 본문 내용이 모두 필요합니다.',
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
    const [updated] = await db
      .update(resumes)
      .set({
        title,
        originalContent,
        updatedAt: new Date(),
      })
      .where(eq(resumes.id, id))
      .returning();

    return {
      success: true,
      resume: updated,
    };
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || '이력서 정보를 저장하는 동안 오류가 발생했습니다.',
    });
  }
});
