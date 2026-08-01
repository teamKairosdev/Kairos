/**
 * Embedding service — 직접 Gemini REST API 호출 (AI SDK 미사용).
 * Gemini embeddings API: models/text-embedding-004:embedContent
 */
import { GEMINI_BASE_URL } from './llm';

const EMBEDDING_MODEL = 'text-embedding-004';

export async function generateEmbedding(text: string): Promise<number[]> {
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';

  if (!googleKey || googleKey.trim() === '' || googleKey.includes('AIzaSy-your')) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is required for embedding generation');
  }

  const res = await fetch(
    `${GEMINI_BASE_URL}/models/${EMBEDDING_MODEL}:embedContent?key=${encodeURIComponent(googleKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
      }),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Embedding API error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = await res.json();
  const values = json?.embedding?.values;
  if (!Array.isArray(values)) {
    throw new Error('Embedding 응답에 embedding.values가 없습니다.');
  }
  return values as number[];
}
