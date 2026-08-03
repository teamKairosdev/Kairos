import { NextRequest, NextResponse } from 'next/server';
import { streamLLMText, type GeminiInputMessage } from '@/server/llm';
import { buildContextWindow, type ContextMessage } from '@/server/context';
import { getDb } from '@/db';
import { mockInterviews, interviewMessages } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/server/getSession';
import { errorMessage, notFound, unauthorized } from '@/server/http';

interface HistoryEntry {
  sender: string;
  message: string;
}

function conflict(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 409 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.userId) return unauthorized('Unauthorized');
    const body = await req.json();
    const { messages } = body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let jobTitle = 'Software Engineer';
    let companyName = '';

    const db = getDb();
    if (db) {
      const [interview] = await db
        .select()
        .from(mockInterviews)
        .where(and(eq(mockInterviews.id, id), eq(mockInterviews.userId, session.userId)));
      if (!interview) {
        return notFound('면접 세션을 찾을 수 없습니다.');
      }
      if (interview.status !== 'in_progress') {
        return conflict('면접이 이미 종료되었습니다.');
      }

      jobTitle = interview.jobTitle;
      companyName = interview.companyName || '';
    }

    const history: HistoryEntry[] = (messages as GeminiInputMessage[])
      .map((m): HistoryEntry | null => {
        let content = '';
        if (typeof m?.content === 'string') content = m.content;
        else if (Array.isArray(m?.parts)) {
          content = m.parts
            .filter((p) => p?.type === 'text' || typeof p?.text === 'string')
            .map((p) => p.text ?? '')
            .join('');
        }
        if (!content.trim()) return null;
        return { sender: m.role === 'user' ? 'user' : 'interviewer', message: content };
      })
      .filter((m): m is HistoryEntry => m !== null);

    if (db) {
      const lastUserMsg = [...history].reverse().find((h) => h.sender === 'user');
      if (lastUserMsg) {
        await db
          .insert(interviewMessages)
          .values({ interviewId: id, sender: 'candidate', message: lastUserMsg.message })
          .catch(() => {});
      }
    }

    const systemPrompt = `당신은 Kairos의 AI 면접관입니다. "${companyName ? companyName + '의 ' : ''}${jobTitle}" 직무 모의 면접을 진행합니다.
전문적이고 현실적인 질문을 하고, 지원자의 답변을 평가하며 건설적인 피드백을 제공하세요.
면접관처럼 자연스럽게 대화하되, 응답은 간결하고 명확하게 한국어로 작성하세요.
매 답변 후 평가 포인트를 간략히 언급하고, 다음 질문으로 자연스럽게 이어가세요.`;

    const contextMessages: ContextMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((h) => ({
        role: (h.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: h.message,
      })),
    ];
    const context = buildContextWindow(contextMessages, { windowSize: 15, maxTokens: 4000 });

    const stream = await streamLLMText({
      instructions: systemPrompt,
      prompt: context,
      temperature: 0.7,
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = '';
    const persistedStream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            assistantMessage += decoder.decode();
            if (db && assistantMessage.trim()) {
              await db.insert(interviewMessages).values({
                interviewId: id,
                sender: 'interviewer',
                message: assistantMessage,
              }).catch(() => {});
            }
            controller.close();
            return;
          }

          controller.enqueue(value);
          assistantMessage += decoder.decode(value, { stream: true });
        } catch (err) {
          controller.error(err);
        }
      },
      cancel(reason) {
        reader.cancel(reason).catch(() => {});
      },
    });

    return new Response(persistedStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: errorMessage(err, 'unknown error') }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
