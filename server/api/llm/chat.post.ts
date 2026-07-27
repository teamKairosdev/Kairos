import { streamText, createUIMessageStreamResponse, convertToModelMessages, type UIMessage } from 'ai';
import { getModelForComplexity } from 'server/services/llm';
import { getCachedResponse, setCachedResponse } from 'server/services/llmCache';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { messages, context }: { messages: UIMessage[]; context?: string } = body || {};

  if (!messages || messages.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Messages are required' });
  }

  const model = getModelForComplexity('high');

  const instructions = `You are Kairos AI, a world-class career advisor and resume specialist.
Help the user with their career preparation including resume refinement, interview coaching, and job search strategy.
Be concise, actionable, and supportive. Respond in Korean when the user writes in Korean.`;

  const result = streamText({
    model,
    instructions,
    messages: await convertToModelMessages(messages),
    temperature: 0.7,
  });

  return createUIMessageStreamResponse({ stream: result.toUIMessageStream() });
});
