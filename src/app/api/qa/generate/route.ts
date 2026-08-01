import { NextRequest, NextResponse } from 'next/server';
import { generateQASet } from '@/server/qa';
import { getDb } from '@/db';
import { qaSets } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError } from '@/server/http';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetRole, careerSummary, count = 5 } = body || {};

    if (!targetRole || !careerSummary) {
      return badRequest('목표 직무와 경력 요약 텍스트를 입력해주세요.');
    }

    const session = await getSession(req);
    const userId = session?.userId || '00000000-0000-0000-0000-000000000000';

    const qaResult = await generateQASet(targetRole, careerSummary, count);

    let savedId: string | undefined;
    try {
      const db = getDb();
      if (db) {
        const [saved] = await db
          .insert(qaSets)
          .values({
            userId,
            title: `${targetRole} 예상 면접 Q&A 세트`,
            targetRole,
            qaPairs: qaResult.qaPairs,
          })
          .returning();
        savedId = saved!.id;
      }
    } catch {
      console.warn('[Kairos] QA save skipped (demo mode - no DB)');
    }

    return NextResponse.json({
      id: savedId || 'demo-qa-' + Date.now(),
      qaSet: qaResult,
    });
  } catch (err: any) {
    console.error('[/api/qa/generate]', err);
    return internalError(err, 'QA generation error');
  }
}
