import { NextRequest, NextResponse } from 'next/server';
import { processAIHumanizer } from '@/server/humanizer';
import { getDb } from '@/db';
import { humanizedTexts } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, payloadTooLarge, unauthorized } from '@/server/http';

const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_TEXT_LENGTH = 20_000;

interface ProcessBody {
  originalText?: unknown;
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

    let body: ProcessBody;
    try {
      body = JSON.parse(rawBody) as ProcessBody;
    } catch {
      return badRequest('요청 형식이 올바르지 않습니다.');
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return badRequest('요청 형식이 올바르지 않습니다.');
    }

    const originalText = typeof body.originalText === 'string' ? body.originalText : '';

    if (!originalText || !originalText.trim()) {
      return badRequest('변환할 문장을 입력해 주세요.');
    }

    if (originalText.length > MAX_TEXT_LENGTH) {
      return payloadTooLarge('입력 길이가 제한을 초과했습니다.');
    }

    const result = await processAIHumanizer(originalText);

    let saved: typeof humanizedTexts.$inferSelect | undefined;
    try {
      const db = getDb();
      if (db) {
        [saved] = await db
          .insert(humanizedTexts)
          .values({
            userId: session.userId,
            originalText,
            humanizedText: result.humanizedText,
            styleScore: result.styleScore,
            changesSummary: result.changesSummary,
          })
          .returning();
      }
    } catch {
      console.warn('[Kairos] Humanizer save skipped (demo mode - no DB)');
    }

    const response = NextResponse.json({
      ...result,
      id: saved?.id || 'demo-hum-' + Date.now(),
      createdAt: (saved?.createdAt || new Date()).toISOString(),
      persisted: Boolean(saved),
      demo: !saved,
    });
    if (!saved) response.headers.set('X-Kairos-Demo', '1');
    return response;
  } catch (err: unknown) {
    console.error('[/api/humanizer/process]', err);
    return internalError(err, 'Humanizer error');
  }
}
