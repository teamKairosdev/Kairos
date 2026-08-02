import { NextRequest } from 'next/server';
import { streamLLMText, type GeminiInputMessage } from '@/server/llm';
import { buildContextWindow, type ContextMessage } from '@/server/context';
import { getDb } from '@/db';
import { mockInterviews, interviewMessages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/server/getSession';
import { errorMessage } from '@/server/http';

interface HistoryEntry {
  sender: string;
  message: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    const body = await req.json();
    const { messages } = body || {};

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let jobTitle = 'Software Engineer';
    let companyName = '';

    const db = getDb();
    if (db) {
      const [interview] = await db.select().from(mockInterviews).where(eq(mockInterviews.id, id));
      if (!interview) {
        return new Response(JSON.stringify({ error: '면접 세션을 찾을 수 없습니다.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (session && interview.userId !== session.userId) {
        return new Response(JSON.stringify({ error: '접근 권한이 없습니다.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
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

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: errorMessage(err, 'unknown error') }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
