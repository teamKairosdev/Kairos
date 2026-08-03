import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import { findOwnedPreparationMessage } from '@/server/preparation';
import { analyzePreparationText, correctPreparationTone } from '@/server/preparationTone';

const toneRequestSchema = z.object({
  content: z.string().trim().min(1).max(20_000).optional(),
  text: z.string().trim().min(1).max(20_000).optional(),
  messageId: z.string().trim().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return badRequest('요청 형식이 올바르지 않습니다.');
    }

    const parsed = toneRequestSchema.safeParse(rawBody);
    if (!parsed.success) return badRequest('교정할 메시지를 입력해주세요.');

    let sourceText = parsed.data.content || parsed.data.text || '';
    if (parsed.data.messageId) {
      const db = getDb();
      if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
      const owned = await findOwnedPreparationMessage(db, parsed.data.messageId, session.userId);
      if (!owned) return notFound('메시지를 찾을 수 없습니다.');
      if (!sourceText) sourceText = owned.message.content;
    }

    if (!sourceText) return badRequest('교정할 메시지를 입력해주세요.');

    const deterministic = analyzePreparationText(sourceText);
    try {
      const correction = await correctPreparationTone(sourceText, deterministic);
      return NextResponse.json({
        deterministic,
        correction,
        provider: 'gemini',
        retryable: false,
        autoSent: false,
        saved: false,
      });
    } catch (error: unknown) {
      console.warn('[/api/preparation-messages/tone] Gemini unavailable', error);
      return NextResponse.json(
        {
          error: '톤 교정 서비스를 지금 사용할 수 없습니다. 잠시 후 다시 시도해주세요.',
          retryable: true,
          deterministic,
          correction: null,
          provider: null,
          autoSent: false,
          saved: false,
        },
        { status: 503 },
      );
    }
  } catch (error: unknown) {
    return internalError(error, '톤 교정에 실패했습니다.');
  }
}
