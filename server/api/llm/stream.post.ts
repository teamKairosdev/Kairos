import { streamText, createUIMessageStreamResponse, convertToModelMessages, type UIMessage } from 'ai';
import { getModelForComplexity } from '../../services/llm';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { messages, systemPrompt, complexity = 'medium' }: {
    messages: UIMessage[];
    systemPrompt?: string;
    complexity?: 'low' | 'medium' | 'high';
  } = body || {};

  if (!messages || messages.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Messages are required' });
  }

  const model = await getModelForComplexity(complexity);

  const result = streamText({
    model,
    instructions: systemPrompt || 'You are Kairos AI assistant. Help the user professionally. Respond in Korean when the user writes in Korean.',
    messages: await convertToModelMessages(messages),
    temperature: 0.7,
  });

  return createUIMessageStreamResponse({ stream: result.toUIMessageStream() });
});
