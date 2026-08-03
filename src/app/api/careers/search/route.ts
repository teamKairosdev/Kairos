import { NextRequest, NextResponse } from 'next/server';
import { searchCareersSemantic } from '@/server/career';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, payloadTooLarge, serviceUnavailable, unauthorized } from '@/server/http';

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
      return NextResponse.json({ query: q, results, semanticSearch: true });
    } catch (err: unknown) {
      console.warn('pgvector search unavailable:', err instanceof Error ? err.message : err);
      return serviceUnavailable('시맨틱 검색을 현재 사용할 수 없습니다. 경력 저장 후 잠시 뒤 다시 시도해주세요.');
    }
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}
