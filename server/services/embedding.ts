import { createOpenAI } from '@ai-sdk/openai';
import { embed } from 'ai';

export async function generateEmbedding(text: string): Promise<number[]> {
  const config = useRuntimeConfig();
  const openaiKey = process.env.OPENAI_API_KEY || config.openaiApiKey;

  if (!openaiKey || openaiKey.trim() === '' || openaiKey.includes('your-openai')) {
    throw new Error('OPENAI_API_KEY is required for embedding generation');
  }

  const openai = createOpenAI({ apiKey: openaiKey });
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: text,
  });
  return embedding;
}
