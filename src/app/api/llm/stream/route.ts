import { NextRequest } from 'next/server';
import { streamLLMText, toGeminiMessages, type GeminiInputMessage } from '@/server/llm';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, unauthorized } from '@/server/http';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const body = await req.json();
    const {
      messages,
      systemPrompt,
    }: { messages: GeminiInputMessage[]; systemPrompt?: string } = body || {};

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return badRequest('Messages are required');
    }
    if (typeof systemPrompt !== 'undefined' && (typeof systemPrompt !== 'string' || systemPrompt.length > 20_000)) {
      return badRequest('system prompt 길이가 제한을 초과했습니다.');
    }
    if (JSON.stringify(messages).length > 64 * 1024) {
      return badRequest('메시지 크기가 제한을 초과했습니다.');
    }

    const stream = await streamLLMText({
      instructions:
        systemPrompt ||
        'You are Kairos AI assistant. Help the user professionally. Respond in Korean when the user writes in Korean.',
      messages: toGeminiMessages(messages),
      temperature: 0.7,
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err: unknown) {
    console.error('[/api/llm/stream]', err);
    return internalError(err, 'LLM stream error');
  }
}
