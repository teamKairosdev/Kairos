import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { analyzeCompanyMetaInfo } from '@/server/companyMeta';
import { getCachedResponse, setCachedResponse } from '@/server/llmCache';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, errorMessage, unauthorized } from '@/server/http';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const body = await req.json();
    const companyName = typeof body?.companyName === 'string' ? body.companyName.trim() : '';
    const rawReviews = typeof body?.rawReviews === 'string' ? body.rawReviews.trim() : '';

    if (!companyName) {
      return badRequest('Company name is required');
    }
    if (companyName.length > 255 || rawReviews.length > 20_000) {
      return badRequest('회사명 또는 리뷰 입력이 너무 깁니다.');
    }

    const cacheScope = rawReviews ? session.userId : 'public';
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ companyName, rawReviews, cacheScope }))
      .digest('hex');
    const cacheKey = `company:meta:${fingerprint}`;
    const cached = await getCachedResponse(cacheKey, 'companyMeta');
    if (cached) {
      return NextResponse.json({ success: true, analysis: JSON.parse(cached), cached: true });
    }

    try {
      const analysis = await analyzeCompanyMetaInfo(companyName, rawReviews);
      await setCachedResponse(cacheKey, 'companyMeta', JSON.stringify(analysis), 86400);

      return NextResponse.json({
        success: true,
        analysis,
      });
    } catch (err: unknown) {
      return NextResponse.json(
        { error: errorMessage(err, 'Company analysis failed') },
        { status: 500 }
      );
    }
  } catch (err: unknown) {
    return internalError(err, 'Company analysis failed');
  }
}
