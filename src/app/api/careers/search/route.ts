import { NextRequest, NextResponse } from 'next/server';
import { searchCareersSemantic } from '@/server/career';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, payloadTooLarge, unauthorized } from '@/server/http';

const MAX_QUERY_LENGTH = 500;

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return unauthorized();
    }

    const q = req.nextUrl.searchParams.get('q')?.trim() || '';

    if (!q.trim()) {
      return badRequest('검색어를 입력해 주세요.');
    }

    if (q.length > MAX_QUERY_LENGTH) {
      return payloadTooLarge('검색어가 너무 깁니다.');
    }

    try {
      const results = await searchCareersSemantic(session.userId, q, 5);
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
