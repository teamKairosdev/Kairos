import { streamText, createUIMessageStreamResponse, convertToModelMessages, type UIMessage } from 'ai';
import { getModelForComplexity } from 'server/services/llm';
import { getDb } from 'db';
import { mockInterviews, interviewMessages } from 'db/schema';
import { eq, asc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Interview ID missing' });

  const body = await readBody(event);
  const { messages }: { messages: UIMessage[] } = body || {};

  if (!messages || messages.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Messages are required' });
  }

  let jobTitle = 'Software Engineer';

  // Load session from DB
  const db = getDb();
  if (db && !id.startsWith('demo-')) {
    try {
      const [session] = await db.select().from(mockInterviews).where(eq(mockInterviews.id, id));
      if (session) jobTitle = session.jobTitle;

      // Save candidate message
      const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
      if (lastUserMsg) {
        const textParts = (lastUserMsg.parts ?? []).filter((p: { type: string }) => p.type === 'text');
        const content = textParts.length > 0 ? textParts.map((p: { text?: string }) => p.text ?? '').join('') : JSON.stringify(lastUserMsg.parts);
        await db.insert(interviewMessages).values({
          interviewId: id,
          sender: 'candidate',
          message: content,
        });
      }
    } catch {
      console.warn('[Kairos] Interview DB load skipped');
    }
  }

  const model = await getModelForComplexity('medium');

  const result = streamText({
    model,
    instructions: `You are an AI Interviewer at Kairos. Conduct a professional mock interview for a "${jobTitle}" position. 
Ask realistic questions, evaluate answers, provide constructive feedback, and move to the next question. 
Keep responses concise and natural in Korean.`,
    messages: await convertToModelMessages(messages),
    temperature: 0.7,
  });

  return createUIMessageStreamResponse({ stream: result.toUIMessageStream() });
});
