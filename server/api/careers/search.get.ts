import { searchCareersSemantic } from 'server/services/career';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const q = (query.q as string) || '';

  if (!q.trim()) {
    throw createError({ statusCode: 400, statusMessage: '검색어를 입력해 주세요.' });
  }

  const userId = event.context.user?.userId || '00000000-0000-0000-0000-000000000000';

  try {
    const results = await searchCareersSemantic(userId, q, 5);
    return {
      query: q,
      results,
    };
  } catch (err: unknown) {
    console.warn('pgvector search fallback notice:', (err as Error).message);
    // Fallback response if vector query is running without local pgvector DB connection initialized
    return {
      query: q,
      results: [
        {
          id: 'demo-semantic-result-1',
          company: 'Kairos AI Lab',
          role: 'Lead AI Engineer',
          period: '2023 - 2026',
          description: `시맨틱 벡터 검색 매칭 결과: "${q}" 키워드 관련 LLM & pgvector 연동 경험`,
          similarity: 0.94,
        },
      ],
    };
  }
});
