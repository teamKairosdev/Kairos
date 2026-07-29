import { getDb } from 'db';
import { portfolios, users } from 'db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const userId = query.userId as string | undefined;

  const db = getDb();
  if (!db) {
    return {
      id: 'demo-portfolio',
      userId: userId || '00000000-0000-0000-0000-000000000000',
      user: { name: '김개발', email: 'dev@example.com' },
      bio: '풀스택 개발자. AI와 웹 기술에 관심이 많습니다.',
      socialLinks: [
        { platform: 'github', url: 'https://github.com/teamKairosdev' },
        { platform: 'blog', url: 'https://blog.example.com' },
      ],
      projects: [
        {
          title: 'Kairos AI 취업 플랫폼',
          description: 'Nuxt 4 + AI SDK 기반 취업 준비 플랫폼',
          techStack: ['Nuxt 4', 'TypeScript', 'PostgreSQL', 'pgvector'],
          projectUrl: 'https://kairos.dev',
          highlights: ['비동기 이력서 고도화 파이프라인', 'SSE 스트리밍 AI 모의 면접'],
          duration: '2025.01 - 현재',
          isAIFetched: false,
        },
      ],
      isPublic: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    if (userId) {
      const [portfolio] = await db
        .select()
        .from(portfolios)
        .where(eq(portfolios.userId, userId));
      if (!portfolio) return null;
      const [user] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId));
      return { ...portfolio, user: user || { name: '알 수 없음', email: '' } };
    }
    const [portfolio] = await db.select().from(portfolios).limit(1);
    return portfolio || null;
  } catch {
    console.warn('[Kairos] portfolio/index.get.ts DB error');
    return null;
  }
});
