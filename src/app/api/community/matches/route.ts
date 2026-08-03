import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import { unauthorized } from '@/server/http';
import {
  COMMUNITY_MATCH_DEFAULT_LIMIT,
  COMMUNITY_MATCH_MAX_LIMIT,
  consumeCommunityMatchRateLimit,
  findCommunityCareerMatches,
} from '@/server/communityMatches';

function responseHeaders(): HeadersInit {
  return {
    'Cache-Control': 'private, no-store',
    Vary: 'Cookie',
  };
}

function parseLimit(rawLimit: string | null): { limit?: number; error?: string } {
  if (rawLimit === null) return { limit: COMMUNITY_MATCH_DEFAULT_LIMIT };
  if (!/^\d+$/.test(rawLimit)) return { error: 'limit은 양의 정수여야 합니다.' };

  const parsed = Number(rawLimit);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return { error: 'limit은 1 이상의 정수여야 합니다.' };
  }

  return { limit: Math.min(COMMUNITY_MATCH_MAX_LIMIT, parsed) };
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) return unauthorized();

  const parsedLimit = parseLimit(req.nextUrl.searchParams.get('limit'));
  if (parsedLimit.error || !parsedLimit.limit) {
    return NextResponse.json({ error: parsedLimit.error }, { status: 400, headers: responseHeaders() });
  }

  const rateLimit = consumeCommunityMatchRateLimit(session.userId);
  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      { error: '매칭 조회 요청이 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: responseHeaders() },
    );
    response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds));
    return response;
  }

  const result = await findCommunityCareerMatches(session.userId, parsedLimit.limit);
  return NextResponse.json(
    {
      matches: result.matches,
      meta: {
        limit: parsedLimit.limit,
        emptyReason: result.emptyReason ?? null,
      },
    },
    { headers: responseHeaders() },
  );
}
