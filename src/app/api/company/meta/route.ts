import { NextRequest, NextResponse } from 'next/server';
import { analyzeCompanyMetaInfo } from '@/server/companyMeta';
import { getCachedResponse, setCachedResponse } from '@/server/llmCache';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, rawReviews } = body || {};

    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
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
    } catch (err: any) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Company analysis failed' },
        { status: 500 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Company analysis failed' }, { status: 500 });
  }
}
