/**
 * AI 이미지 생성 서비스 — 직접 Imagen REST API 호출 (AI SDK 미사용).
 * Gemini Imagen API: models/imagen-3.0-generate-001:predict
 */
import { GEMINI_BASE_URL } from './llm';

const IMAGEN_MODEL = 'imagen-3.0-generate-001';

function aspectRatioFromSize(size: string): string {
  const [w, h] = size.split('x').map(Number);
  if (!w || !h) return '1:1';
  if (w > h) return '16:9';
  if (h > w) return '9:16';
  return '1:1';
}

export async function generateStudioImage(prompt: string): Promise<string> {
  const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!googleApiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다.');
  }

  const res = await fetch(
    `${GEMINI_BASE_URL}/models/${IMAGEN_MODEL}:predict?key=${encodeURIComponent(googleApiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: aspectRatioFromSize('1024x1024') },
      }),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Imagen API error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = await res.json();
  const base64 = json?.predictions?.[0]?.bytesBase64Encoded as string | undefined;
  if (!base64) {
    throw new Error('이미지 생성 실패: base64 데이터가 없습니다.');
  }
  return base64;
}
