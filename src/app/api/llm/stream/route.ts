import { NextRequest, NextResponse } from 'next/server';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { getModelForComplexity } from '@/server/llm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      systemPrompt,
      complexity = 'medium',
    }: {
      messages: UIMessage[];
      systemPrompt?: string;
      complexity?: 'low' | 'medium' | 'high';
    } = body || {};

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    const model = await getModelForComplexity(complexity);

    const result = streamText({
      model,
      system:
        systemPrompt ||
        'You are Kairos AI assistant. Help the user professionally. Respond in Korean when the user writes in Korean.',
      messages: await convertToModelMessages(messages),
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (err: any) {
    console.error('[/api/llm/stream]', err);
    return NextResponse.json({ error: err.message || 'LLM stream error' }, { status: 500 });
  }
}
