import { streamText, createUIMessageStreamResponse, convertToModelMessages, type UIMessage } from 'ai';
import { getModelForComplexity } from 'server/services/llm';
import { getDb } from 'db';
import { mockInterviews, interviewMessages } from 'db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' });
  }

  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Interview ID missing' });

  const body = await readBody(event);
  const { messages }: { messages: UIMessage[] } = body || {};

  if (!messages || messages.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Messages are required' });
  }

  const db = getDb();
  let jobTitle = 'Software Engineer';
  let companyName = '';

  if (db) {
    // Verify session belongs to this user
    const [session] = await db
      .select()
      .from(mockInterviews)
      .where(eq(mockInterviews.id, id));

    if (!session) {
      throw createError({ statusCode: 404, statusMessage: '면접 세션을 찾을 수 없습니다.' });
    }
    if (session.userId !== userId) {
      throw createError({ statusCode: 403, statusMessage: '접근 권한이 없습니다.' });
    }

    jobTitle = session.jobTitle;
    companyName = session.companyName || '';

    // Persist the candidate message
    const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
    if (lastUserMsg) {
      const textParts = (lastUserMsg.parts ?? []).filter((p: { type: string }) => p.type === 'text');
      const content = textParts.length > 0
        ? textParts.map((p: { text?: string }) => p.text ?? '').join('')
        : JSON.stringify(lastUserMsg.parts);
      await db.insert(interviewMessages).values({
        interviewId: id,
        sender: 'candidate',
        message: content,
      });
    }
  }

  const model = await getModelForComplexity('medium');

  const result = streamText({
    model,
    instructions: `당신은 Kairos의 AI 면접관입니다. "${companyName ? companyName + '의 ' : ''} ${jobTitle}" 직무 모의 면접을 진행합니다.
전문적이고 현실적인 질문을 하고, 지원자의 답변을 평가하며 건설적인 피드백을 제공하세요.
면접관처럼 자연스럽게 대화하되, 응답은 간결하고 명확하게 한국어로 작성하세요.
매 답변 후 평가 포인트를 간략히 언급하고, 다음 질문으로 자연스럽게 이어가세요.`,
    messages: await convertToModelMessages(messages),
    temperature: 0.7,
  });

  return createUIMessageStreamResponse({ stream: result.toUIMessageStream() });
});
