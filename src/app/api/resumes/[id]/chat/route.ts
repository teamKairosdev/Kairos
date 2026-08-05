import { NextRequest, NextResponse } from 'next/server';
import { callLLMStructured, streamLLMText } from '@/server/llm';
import { z } from 'zod';
import { getSession } from '@/server/getSession';
import { getDb } from '@/db';
import { resumes } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { badRequest, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import { checkOutputAsyncGuardrail } from '@/server/guardrail';

function streamEvent(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value)}\n`);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const { id } = await params;
    const db = getDb();
    if (!db) return serviceUnavailable('이력서 저장소를 사용할 수 없습니다.');
    const [resume] = await db
      .select({ id: resumes.id })
      .from(resumes)
      .where(and(eq(resumes.id, id), eq(resumes.userId, session.userId)));
    if (!resume) return notFound('Resume not found');

    const body = await req.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const currentContent = typeof body?.currentContent === 'string' ? body.currentContent : '';
    if (!message) return badRequest('메시지를 입력해주세요.');
    if (message.length > 10_000 || currentContent.length > 100_000) return badRequest('입력 길이가 제한을 초과했습니다.');

    const responsePrompt = `사용자가 이력서 수정을 요청했습니다.
현재 이력서 본문:
${currentContent || ''}

사용자 요청:
${message}

사용자의 요청에 대해 친절하고 구체적인 답변만 작성하세요. 전체 이력서 본문을 다시 출력하지 말고, 어떤 근거를 확인했고 어떤 방향으로 수정할지 설명하세요.`;

    const suggestionPrompt = `사용자가 이력서 수정을 요청했습니다.
현재 이력서 본문:
${currentContent || ''}

사용자 요청:
${message}

개선된 전체 이력서 본문을 suggestedContent에 담아주세요. 원문에 없는 성과나 사실을 만들지 말고, 사용자가 확인할 수 있도록 기존 경험을 더 구체적인 문장으로 정리하세요.`;

    const responseStream = await streamLLMText({
      prompt: responsePrompt,
      temperature: 0.7,
    });
    const reader = responseStream.getReader();
    const decoder = new TextDecoder();

    const outputStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let responseText = '';
        try {
          controller.enqueue(streamEvent({ type: 'start' }));
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            if (!text) continue;
            responseText += text;
            controller.enqueue(streamEvent({ type: 'text', value: text }));
          }
          responseText += decoder.decode();
          if (!responseText.trim()) throw new Error('EMPTY_RESPONSE');

          try {
            const result = await callLLMStructured<{ suggestedContent?: string }>({
              prompt: suggestionPrompt,
              schema: z.object({ suggestedContent: z.string().optional() }),
            });
            const guardrail = result.suggestedContent ? checkOutputAsyncGuardrail(result.suggestedContent) : null;
            const suggestedContent = guardrail?.sanitizedContent || result.suggestedContent;
            if (suggestedContent) {
              controller.enqueue(streamEvent({ type: 'suggestion_start' }));
              for (let index = 0; index < suggestedContent.length; index += 96) {
                controller.enqueue(streamEvent({ type: 'suggestion_delta', value: suggestedContent.slice(index, index + 96) }));
              }
              controller.enqueue(streamEvent({ type: 'suggestion_done' }));
            }
          } catch {
            controller.enqueue(streamEvent({ type: 'suggestion_error', value: '개선 초안을 생성하지 못했습니다.' }));
          }

          controller.enqueue(streamEvent({ type: 'done' }));
          controller.close();
        } catch {
          controller.enqueue(streamEvent({ type: 'error', value: '요청을 처리하는 중 오류가 발생했습니다.' }));
          controller.close();
        }
      },
      cancel(reason) {
        reader.cancel(reason).catch(() => undefined);
      },
    });

    return new Response(outputStream, {
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({
      responseText: '죄송합니다. 요청을 처리하는 중 오류가 발생했습니다.',
    });
  }
}
