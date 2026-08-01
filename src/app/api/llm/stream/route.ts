import { NextRequest, NextResponse } from 'next/server';
import { streamLLMText, toGeminiMessages } from '@/server/llm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      systemPrompt,
    }: { messages: any[]; systemPrompt?: string } = body || {};

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
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
  } catch (err: any) {
    console.error('[/api/llm/stream]', err);
    return NextResponse.json({ error: err.message || 'LLM stream error' }, { status: 500 });
  }
}
