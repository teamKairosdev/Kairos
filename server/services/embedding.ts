import { createOpenAI } from '@ai-sdk/openai';
import { embed } from 'ai';

export async function generateEmbedding(text: string): Promise<number[]> {
  const config = useRuntimeConfig();
  const openaiKey = process.env.OPENAI_API_KEY || config.openaiApiKey;

  if (openaiKey && openaiKey.trim() !== '' && !openaiKey.includes('your-openai')) {
    try {
      const openai = createOpenAI({ apiKey: openaiKey });
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: text,
      });
      return embedding;
    } catch (err) {
      console.warn('Embedding API call failed, falling back to normalized vector generation:', err);
    }
  }

  // Fallback 1536-dimensional normalized hash vector for local development/offline testing
  return generateDeterministicVector(text, 1536);
}

function generateDeterministicVector(text: string, dimensions: number): number[] {
  const vec: number[] = new Array(dimensions).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  for (let i = 0; i < dimensions; i++) {
    const val = Math.sin(hash + i) * 10000;
    vec[i] = val - Math.floor(val);
  }

  // Normalize vector to unit length
  const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  return vec.map((val) => (magnitude === 0 ? 0 : val / magnitude));
}
