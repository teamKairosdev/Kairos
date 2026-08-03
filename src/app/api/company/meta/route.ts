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
    const { companyName, rawReviews } = body || {};

    if (!companyName) {
      return badRequest('Company name is required');
    }

    const cacheKey = `company:meta:${companyName}`;
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
