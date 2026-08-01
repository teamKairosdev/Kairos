/**
 * Embedding service ported from server/services/embedding.ts
 * useRuntimeConfig() → process.env 직접 접근으로 변환 (Next.js)
 */
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { embed } from 'ai';

export async function generateEmbedding(text: string): Promise<number[]> {
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';

  if (!googleKey || googleKey.trim() === '' || googleKey.includes('AIzaSy-your')) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is required for embedding generation');
  }

  const google = createGoogleGenerativeAI({ apiKey: googleKey });
  const { embedding } = await embed({
    model: google.embedding('text-embedding-004'),
    value: text,
  });
  return embedding;
}
