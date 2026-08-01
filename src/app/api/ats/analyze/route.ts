import { NextRequest, NextResponse } from 'next/server';
import { analyzeATSCompatibility } from '@/server/ats';
import { getDb } from '@/db';
import { atsAnalyses } from '@/db/schema';
import { getSession } from '@/server/getSession';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobTitle, jobDescription, resumeText, resumeId } = body || {};

    if (!jobTitle || !jobDescription || !resumeText) {
      return NextResponse.json(
        { error: '직무명, 채용공고 본문, 이력서 텍스트가 모두 필요합니다.' },
        { status: 400 }
      );
    }

    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: '로그인이 필요한 서비스입니다.' }, { status: 401 });
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
  } catch (err: any) {
    console.error('[/api/ats/analyze]', err);
    return NextResponse.json(
      { error: err.message || 'ATS 분석 결과를 저장하는 동안 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
