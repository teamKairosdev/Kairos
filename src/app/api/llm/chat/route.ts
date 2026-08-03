import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { streamLLMText, toGeminiMessages, collectStreamText, type GeminiInputMessage } from '@/server/llm';
import { getCachedResponse, setCachedResponse } from '@/server/llmCache';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, unauthorized } from '@/server/http';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const body = await req.json();
    const { messages, context }: { messages: GeminiInputMessage[]; context?: string } = body || {};

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return badRequest('Messages are required');
    }
    if (context !== undefined && (typeof context !== 'string' || context.length > 20_000)) {
      return badRequest('Context 길이가 제한을 초과했습니다.');
    }
    if (JSON.stringify(messages).length > 64 * 1024) {
      return badRequest('메시지 크기가 제한을 초과했습니다.');
    }

    const lastUserMsg = [...messages].reverse().find((m) => m?.role === 'user');
    const msgContent = toGeminiMessages([lastUserMsg])[0]?.content || '';
    const complexity = msgContent.length > 500 ? 'high' : msgContent.length > 100 ? 'medium' : 'low';
    // Chat output depends on the complete conversation, context, and owner.
    // A last-message-only key could return one user's private answer to another.
    const cacheInput = JSON.stringify({ userId: session.userId, messages, context: context || '' });
    const cacheKey = `chat:${createHash('sha256').update(cacheInput).digest('hex')}`;

    const cached = await getCachedResponse(cacheKey, complexity);
    if (cached) {
      return new Response(cached, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const systemPrompt = `You are Kairos AI, a world-class career advisor and resume specialist.
Help the user with their career preparation including resume refinement, interview coaching, and job search strategy.
Be concise, actionable, and supportive. Respond in Korean when the user writes in Korean.${context ? `\n\nContext: ${context}` : ''}`;

    const stream = await streamLLMText({
      instructions: systemPrompt,
      messages: toGeminiMessages(messages),
      temperature: complexity === 'low' ? 0.5 : 0.7,
    });

    const [clientStream, cacheStream] = stream.tee();
    void collectStreamText(cacheStream).then((text) => {
      if (text) void setCachedResponse(cacheKey, complexity, text, 3600);
    });

    return new Response(clientStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err: unknown) {
    console.error('[/api/llm/chat]', err);
    return internalError(err, 'LLM error');
  }
}
