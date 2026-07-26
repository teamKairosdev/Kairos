import { db } from 'db';
import { careers } from 'db/schema';
import { eq, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId;

  if (!userId) {
    return [
      {
        id: 'demo-career-1',
        company: 'Kairos Tech Inc.',
        role: 'Lead Full-Stack Architect',
        period: '2023.01 - 재직중',
        description: 'Nuxt 4 및 pgvector 기반 AI 커리어 에이전트 시스템 전체 아키텍처 설계 및 구축',
        achievements: ['Vercel AI SDK 연동으로 99.9% LLM 안정성 달성', 'pgvector 시맨틱 검색 엔진 도입'],
        createdAt: new Date(),
      }
    ];
  }

  return await db
    .select()
    .from(careers)
    .where(eq(careers.userId, userId))
    .orderBy(desc(careers.createdAt));
});
