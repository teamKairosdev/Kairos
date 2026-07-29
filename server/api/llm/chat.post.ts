import { streamText, createUIMessageStreamResponse, convertToModelMessages, type UIMessage } from 'ai';
import { getModelForComplexity } from 'server/services/llm';
import { getCachedResponse, setCachedResponse } from 'server/services/llmCache';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { messages, context }: { messages: UIMessage[]; context?: string } = body || {};

  if (!messages || messages.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Messages are required' });
  }

  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || ''
  const complexity = lastUserMsg.length > 500 ? 'high' : lastUserMsg.length > 100 ? 'medium' : 'low'
  const cacheKey = `chat:${lastUserMsg.slice(0, 200)}`
  const cached = await getCachedResponse(cacheKey, complexity)
  if (cached) {
    return createUIMessageStreamResponse({ stream: new ReadableStream({
      start(controller) {
        controller.enqueue(JSON.stringify({ type: 'text', value: cached }))
        controller.close()
      },
    }) })
  }

  const model = getModelForComplexity(complexity);

  const instructions = `You are Kairos AI, a world-class career advisor and resume specialist.
Help the user with their career preparation including resume refinement, interview coaching, and job search strategy.
Be concise, actionable, and supportive. Respond in Korean when the user writes in Korean.`;

  const result = streamText({
    model,
    instructions,
    messages: await convertToModelMessages(messages),
    temperature: complexity === 'low' ? 0.5 : 0.7,
    onFinish: async (event) => {
      if (event.text) {
        await setCachedResponse(cacheKey, complexity, event.text, 3600);
      }
    },
  });

  return createUIMessageStreamResponse({ stream: result.toUIMessageStream() });
});
