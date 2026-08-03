/**
 * Embedding service — 직접 Gemini REST API 호출 (AI SDK 미사용).
 * Gemini embeddings API: models/text-embedding-004:embedContent
 */
import { GEMINI_BASE_URL } from './llm';
import { fetchWithTimeout } from './http';

const EMBEDDING_MODEL = 'text-embedding-004';
export const EMBEDDING_DIMENSIONS = 768;
export const EMBEDDING_REQUEST_TIMEOUT_MS = 20_000;

export async function generateEmbedding(text: string): Promise<number[]> {
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';

  if (!googleKey || googleKey.trim() === '' || googleKey.includes('AIzaSy-your')) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is required for embedding generation');
  }

  const res = await fetchWithTimeout(
    `${GEMINI_BASE_URL}/models/${EMBEDDING_MODEL}:embedContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': googleKey },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
      }),
    },
    EMBEDDING_REQUEST_TIMEOUT_MS,
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
  if (values.length !== EMBEDDING_DIMENSIONS || values.some((value: unknown) => typeof value !== 'number' || !Number.isFinite(value))) {
    throw new Error(`Embedding 응답 차원이 ${EMBEDDING_DIMENSIONS}과 일치하지 않습니다.`);
  }
  return values as number[];
}
