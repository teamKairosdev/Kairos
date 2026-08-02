import { NextRequest, NextResponse } from 'next/server';
import { analyzeATSCompatibility } from '@/server/ats';
import { getDb } from '@/db';
import { atsAnalyses } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { unauthorized, badRequest, internalError } from '@/server/http';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobTitle, jobDescription, resumeText, resumeId } = body || {};

    if (!jobTitle || !jobDescription || !resumeText) {
      return badRequest('직무명, 채용공고 본문, 이력서 텍스트가 모두 필요합니다.');
    }

    const session = await getSession(req);
    if (!session?.userId) {
      return unauthorized('로그인이 필요한 서비스입니다.');
    }

    const analysis = analyzeATSCompatibility(resumeText, jobDescription);

    const db = getDb();
    if (!db) {
      return NextResponse.json({ id: 'demo-ats-' + Date.now(), analysis });
    }

    const [saved] = await db
      .insert(atsAnalyses)
      .values({
        userId: session.userId,
        jobTitle,
        jobDescription,
        resumeId: resumeId || null,
        matchScore: analysis.matchScore,
        missingKeywords: analysis.missingKeywords,
        foundKeywords: analysis.foundKeywords,
        recommendations: analysis.recommendations,
        detailedBreakdown: analysis.detailedBreakdown,
      })
      .returning();

    return NextResponse.json({ id: saved.id, analysis });
  } catch (err: unknown) {
    console.error('[/api/ats/analyze]', err);
    return internalError(err, 'ATS 분석 결과를 저장하는 동안 오류가 발생했습니다.');
  }
}
