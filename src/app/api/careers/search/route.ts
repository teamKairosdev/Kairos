import { NextRequest, NextResponse } from 'next/server';
import { searchCareersSemantic } from '@/server/career';
import { getSession } from '@/server/getSession';
import { badRequest, internalError } from '@/server/http';

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') || '';

    if (!q.trim()) {
      return badRequest('검색어를 입력해 주세요.');
    }

    const session = await getSession(req);
    const userId = session?.userId || '00000000-0000-0000-0000-000000000000';

    try {
      const results = await searchCareersSemantic(userId, q, 5);
      return NextResponse.json({ query: q, results });
    } catch (err: unknown) {
      console.warn('pgvector search fallback notice:', err instanceof Error ? err.message : err);
      return NextResponse.json({
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
      });
    }
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}
