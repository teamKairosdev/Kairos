import { getDb } from 'db';
import { portfolios } from 'db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const userId = event.context.user?.userId || '00000000-0000-0000-0000-000000000000';
  const { bio, socialLinks, projects, isPublic } = body || {};

  const db = getDb();
  if (!db) {
    return {
      success: true,
      message: '데모 모드: 포트폴리오가 저장되었습니다.',
      portfolio: { id: 'demo-portfolio', userId, bio, socialLinks, projects, isPublic, createdAt: new Date().toISOString() },
    };
  }

  try {
    const [existing] = await db.select().from(portfolios).where(eq(portfolios.userId, userId));
    if (existing) {
      const [updated] = await db.update(portfolios).set({ bio, socialLinks, projects, isPublic, updatedAt: new Date() }).where(eq(portfolios.userId, userId)).returning();
      return { success: true, portfolio: updated };
    }
    const [created] = await db.insert(portfolios).values({ userId, bio, socialLinks, projects, isPublic }).returning();
    return { success: true, portfolio: created };
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message || '포트폴리오 저장 실패' });
  }
});
