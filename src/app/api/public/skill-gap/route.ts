import { NextRequest, NextResponse } from 'next/server';
import { getPublicSkillGapReport } from '@/server/publicSkillGap';
import { internalError } from '@/server/http';

export async function GET(req: NextRequest) {
  try {
    const region = req.nextUrl.searchParams.get('region') || '경기도';

    const report = await getPublicSkillGapReport(region);

    const res = NextResponse.json(report);
    res.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    return res;
  } catch (err: any) {
    return internalError(err, 'Skill gap analysis failed');
  }
}
