import { NextRequest, NextResponse } from 'next/server';
import { generateQASet } from '@/server/qa';
import { getDb } from '@/db';
import { qaSets } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, payloadTooLarge, unauthorized } from '@/server/http';

const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_TARGET_ROLE_LENGTH = 255;
const MAX_CAREER_SUMMARY_LENGTH = 20_000;
const MAX_QA_COUNT = 10;

interface GenerateBody {
  targetRole?: unknown;
  careerSummary?: unknown;
  count?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return unauthorized();
    }

    const contentLength = Number(req.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return payloadTooLarge('요청 크기가 제한을 초과했습니다.');
    }

    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return payloadTooLarge('요청 크기가 제한을 초과했습니다.');
    }

    let body: GenerateBody;
    try {
      body = JSON.parse(rawBody) as GenerateBody;
    } catch {
      return badRequest('요청 형식이 올바르지 않습니다.');
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return badRequest('요청 형식이 올바르지 않습니다.');
    }

    const targetRole = typeof body.targetRole === 'string' ? body.targetRole.trim() : '';
    const careerSummary = typeof body.careerSummary === 'string' ? body.careerSummary.trim() : '';
    const count = body.count === undefined ? 5 : body.count;

    if (!targetRole || !careerSummary) {
      return badRequest('목표 직무와 경력 요약 텍스트를 입력해주세요.');
    }

    if (targetRole.length > MAX_TARGET_ROLE_LENGTH || careerSummary.length > MAX_CAREER_SUMMARY_LENGTH) {
      return payloadTooLarge('입력 길이가 제한을 초과했습니다.');
    }

    if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > MAX_QA_COUNT) {
      return badRequest('문항 수는 1~10 사이의 정수여야 합니다.');
    }

    const qaResult = await generateQASet(targetRole, careerSummary, count);

    let saved: typeof qaSets.$inferSelect | undefined;
    try {
      const db = getDb();
      if (db) {
        [saved] = await db
          .insert(qaSets)
          .values({
            userId: session.userId,
            title: `${targetRole} 예상 면접 Q&A 세트`,
            targetRole,
            qaPairs: qaResult.qaPairs,
          })
          .returning();
      }
    } catch {
      console.warn('[Kairos] QA save skipped (demo mode - no DB)');
    }

    const response = NextResponse.json({
      id: saved?.id || 'demo-qa-' + Date.now(),
      title: qaResult.title,
      targetRole,
      qaPairs: qaResult.qaPairs,
      createdAt: (saved?.createdAt || new Date()).toISOString(),
      persisted: Boolean(saved),
      demo: !saved,
    });
    if (!saved) response.headers.set('X-Kairos-Demo', '1');
    return response;
  } catch (err: unknown) {
    console.error('[/api/qa/generate]', err);
    return internalError(err, 'QA generation error');
  }
}
