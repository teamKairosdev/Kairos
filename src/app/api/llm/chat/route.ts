import { NextRequest, NextResponse } from 'next/server';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { getModelForComplexity } from '@/server/llm';
import { getCachedResponse, setCachedResponse } from '@/server/llmCache';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, context }: { messages: UIMessage[]; context?: string } = body || {};

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
    const msgContent = lastUserMsg?.parts
      ? (lastUserMsg.parts as any[]).filter((p) => p.type === 'text').map((p) => p.text).join('')
      : '';
    const msgStr = msgContent || '';
    const complexity = msgStr.length > 500 ? 'high' : msgStr.length > 100 ? 'medium' : 'low';
    const cacheKey = `chat:${msgStr.slice(0, 200)}`;

    const cached = await getCachedResponse(cacheKey, complexity);
    if (cached) {
      return new Response(cached, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const model = await getModelForComplexity(complexity);

    const systemPrompt = `You are Kairos AI, a world-class career advisor and resume specialist.
Help the user with their career preparation including resume refinement, interview coaching, and job search strategy.
Be concise, actionable, and supportive. Respond in Korean when the user writes in Korean.${context ? `\n\nContext: ${context}` : ''}`;

    const result = streamText({
      model,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      temperature: complexity === 'low' ? 0.5 : 0.7,
      onFinish: async (event) => {
        if (event.text) {
          await setCachedResponse(cacheKey, complexity, event.text, 3600);
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (err: any) {
    console.error('[/api/llm/chat]', err);
    return NextResponse.json({ error: err.message || 'LLM error' }, { status: 500 });
  }
}
