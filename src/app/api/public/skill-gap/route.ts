import { NextRequest, NextResponse } from 'next/server';
import { getPublicSkillGapReport } from '@/server/publicSkillGap';
import { badRequest, internalError } from '@/server/http';

export async function GET(req: NextRequest) {
  try {
    const region = req.nextUrl.searchParams.get('region') || '경기도';
    if (region.length > 100) return badRequest('지역 이름이 너무 깁니다.');

    const report = await getPublicSkillGapReport(region);

    const res = NextResponse.json(report);
    res.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    return res;
  } catch (err: unknown) {
    return internalError(err, 'Skill gap analysis failed');
  }
}
