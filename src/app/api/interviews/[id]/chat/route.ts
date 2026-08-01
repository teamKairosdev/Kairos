import { NextRequest } from 'next/server';
import { streamLLMText } from '@/server/llm';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { messages } = body || {};

    const lastMessage = messages?.[messages.length - 1]?.content || '면접 자기소개를 해주세요.';

    const systemPrompt = `당신은 Kairos AI 전문 면접관입니다.
지원자의 답변을 경청하고, 날카롭고 건설적인 꼬리 질문이나 추가 면접 질문을 던지세요.
한국어로 자연스럽게 답변해 주세요.`;

    const streamResult = await streamLLMText({
      instructions: systemPrompt,
      prompt: lastMessage,
    });

    return streamResult.toTextStreamResponse();
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
