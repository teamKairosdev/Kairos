import { NextRequest, NextResponse } from 'next/server';
import { analyzeATSCompatibility } from '@/server/ats';
import { getDb } from '@/db';
import { atsAnalyses, resumes } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/server/getSession';
import { unauthorized, badRequest, internalError, notFound } from '@/server/http';

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
      const response = NextResponse.json({ id: 'demo-ats', analysis, demo: true, persisted: false });
      response.headers.set('X-Kairos-Demo', '1');
      return response;
    }

    if (resumeId) {
      const [ownedResume] = await db
        .select({ id: resumes.id })
        .from(resumes)
        .where(and(eq(resumes.id, resumeId), eq(resumes.userId, session.userId)));
      if (!ownedResume) return notFound('Resume not found');
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
