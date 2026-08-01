/**
 * LLM service — direct Gemini REST API implementation (AI SDK 미사용).
 *
 * 이 모듈이 모든 LLM 호출의 유일한 진입점이다.
 * (qa.ts, humanizer.ts, career.ts, resume/interview/llm 라우트 등 전부 여기서 import)
 *
 * - generateContent : 단일 텍스트 생성
 * - generateContent + responseSchema : JSON 스키마 기반 구조화 출력 (zod → OpenAPI 변환)
 * - streamGenerateContent(alt=sse) : 텍스트 스트리밍 (ReadableStream<Uint8Array>)
 */
import { z } from 'zod';
import { getSystemConfig } from './systemConfig';

export interface LLMMessage {
  role: 'user' | 'model';
  content: string;
}

export interface LLMOptions {
  instructions?: string;
  prompt?: string;
  temperature?: number;
  model?: string;
  messages?: LLMMessage[];
}

export const DEFAULT_MODEL = 'gemini-2.0-flash-001';
export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

interface EndpointConfig {
  apiKey: string;
  baseUrl: string;
  headers: Record<string, string>;
  gatewayUrl: string;
}

async function getConfig(): Promise<EndpointConfig> {
  const [googleKey, gatewayUrl, gatewayKey] = await Promise.all([
    getSystemConfig('GOOGLE_GENERATIVE_AI_API_KEY').then(
      (v) => v || process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''
    ),
    getSystemConfig('VERCEL_AI_GATEWAY_URL').then(
      (v) => v || process.env.VERCEL_AI_GATEWAY_URL || ''
    ),
    getSystemConfig('VERCEL_AI_GATEWAY_KEY').then(
      (v) => v || process.env.VERCEL_AI_GATEWAY_KEY || ''
    ),
  ]);

  if (!googleKey || googleKey.trim() === '' || googleKey.includes('your')) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다.');
  }

  if (gatewayUrl) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (gatewayKey) {
      headers['x-vercel-ai-gateway-key'] = gatewayKey;
      headers['Authorization'] = `Bearer ${gatewayKey}`;
    }
    return { apiKey: googleKey, baseUrl: gatewayUrl.replace(/\/$/, ''), headers, gatewayUrl };
  }

  return {
    apiKey: googleKey,
    baseUrl: GEMINI_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    gatewayUrl: '',
  };
}

async function getGeminiModel(modelName = DEFAULT_MODEL): Promise<string> {
  await getConfig();
  return modelName;
}

async function getGatewayModel(
  modelIdentifier = 'google/gemini-2.0-flash-001'
): Promise<string> {
  const { gatewayUrl } = await getConfig();
  if (!gatewayUrl) return getGeminiModel();
  return modelIdentifier.replace(/^google\//, '');
}

export async function getPreferredLanguageModel(requestedModel?: string): Promise<string> {
  const { gatewayUrl } = await getConfig();
  if (gatewayUrl) {
    return getGatewayModel(requestedModel || 'google/gemini-2.0-flash-001');
  }
  return getGeminiModel(requestedModel || DEFAULT_MODEL);
}

/**
 * 클라이언트 메시지(UIMessage: {role, content|parts}) → Gemini contents용 메시지 변환.
 */
export function toGeminiMessages(messages: unknown[] | undefined): LLMMessage[] {
  const result: LLMMessage[] = [];
  for (const raw of messages ?? []) {
    const msg = raw as any;
    if (!msg) continue;
    const role = msg.role === 'user' ? 'user' : 'model';
    let content = '';
    if (typeof msg.content === 'string') {
      content = msg.content;
    } else if (Array.isArray(msg.parts)) {
      content = (msg.parts as any[])
        .filter((p) => p?.type === 'text' || typeof p?.text === 'string')
        .map((p) => p.text ?? '')
        .join('');
    }
    if (!content.trim()) continue;
    result.push({ role, content });
  }
  return result;
}

/**
 * zod 스키마 → Gemini responseSchema(OpenAPI 3.0 subset) 변환.
 */
function zodToOpenApiSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(schema.shape)) {
      properties[key] = zodToOpenApiSchema(value as z.ZodTypeAny);
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodNullable)) {
        required.push(key);
      }
    }
    return { type: 'object', properties, required };
  }
  if (schema instanceof z.ZodArray) {
    return { type: 'array', items: zodToOpenApiSchema(schema.element) };
  }
  if (schema instanceof z.ZodEnum) {
    return { type: 'string', enum: Array.from(schema._def.values) };
  }
  if (schema instanceof z.ZodNativeEnum) {
    return { type: 'string', enum: Object.values(schema._def.values) };
  }
  if (schema instanceof z.ZodLiteral) {
    const literal: unknown = schema._def.value;
    const type =
      typeof literal === 'number' ? 'number' : typeof literal === 'boolean' ? 'boolean' : 'string';
    return { type, enum: [literal] };
  }
  if (schema instanceof z.ZodString) return { type: 'string' };
  if (schema instanceof z.ZodNumber) return { type: 'number' };
  if (schema instanceof z.ZodBoolean) return { type: 'boolean' };
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return zodToOpenApiSchema(schema._def.innerType);
  }
  return { type: 'string' };
}

function buildEndpointUrl(
  cfg: EndpointConfig,
  model: string,
  action: 'generateContent' | 'streamGenerateContent'
): string {
  const query = new URLSearchParams();
  if (cfg.baseUrl.includes('generativelanguage.googleapis.com')) {
    query.set('key', cfg.apiKey);
  }
  if (action === 'streamGenerateContent') query.set('alt', 'sse');
  const qs = query.toString();
  return `${cfg.baseUrl}/models/${encodeURIComponent(model)}:${action}${qs ? `?${qs}` : ''}`;
}

function buildRequestBody(
  options: LLMOptions,
  extra?: { responseSchema?: Record<string, unknown> }
): Record<string, unknown> {
  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const msg of options.messages ?? []) {
    contents.push({ role: msg.role, parts: [{ text: msg.content }] });
  }
  if (options.prompt) {
    contents.push({ role: 'user', parts: [{ text: options.prompt }] });
  }
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: '' }] });
  }

  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.7,
  };
  if (extra?.responseSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = extra.responseSchema;
  }

  const body: Record<string, unknown> = { contents, generationConfig };
  if (options.instructions) {
    body.systemInstruction = { parts: [{ text: options.instructions }] };
  }
  return body;
}

function extractText(payload: any): string {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
    .join('');
}

async function requestGemini(
  cfg: EndpointConfig,
  model: string,
  action: 'generateContent' | 'streamGenerateContent',
  body: Record<string, unknown>
): Promise<Response> {
  const res = await fetch(buildEndpointUrl(cfg, model, action), {
    method: 'POST',
    headers: cfg.headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const kind = action === 'streamGenerateContent' ? 'Gemini stream error' : 'Gemini API error';
    throw new Error(`${kind} ${res.status}: ${detail.slice(0, 500)}`);
  }
  return res;
}

async function postGenerateContent(
  cfg: EndpointConfig,
  model: string,
  body: Record<string, unknown>
): Promise<any> {
  return (await requestGemini(cfg, model, 'generateContent', body)).json();
}

async function resolveModelAndConfig(options: LLMOptions): Promise<{ cfg: EndpointConfig; model: string }> {
  const cfg = await getConfig();
  const model = options.model || (await getPreferredLanguageModel(options.model));
  return { cfg, model };
}

export async function callLLMText(options: LLMOptions): Promise<string> {
  const { cfg, model } = await resolveModelAndConfig(options);
  const json = await postGenerateContent(cfg, model, buildRequestBody(options));
  const text = extractText(json);
  if (!text) {
    const reason = json?.candidates?.[0]?.finishReason;
    if (reason === 'SAFETY') throw new Error('LLM 응답이 안전 정책에 의해 차단되었습니다.');
    throw new Error('LLM에서 빈 응답을 받았습니다.');
  }
  return text;
}

export async function callLLMStructured<T>(
  options: LLMOptions & { schema: z.ZodType<T> }
): Promise<T> {
  const { cfg, model } = await resolveModelAndConfig(options);
  const body = buildRequestBody(
    { ...options, temperature: options.temperature ?? 0.3 },
    { responseSchema: zodToOpenApiSchema(options.schema) }
  );
  const json = await postGenerateContent(cfg, model, body);
  const text = extractText(json);
  if (!text) {
    throw new Error('LLM 구조화 응답이 비어 있습니다.');
  }
  const parsed = JSON.parse(text) as unknown;
  const result = options.schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`LLM 구조화 응답 검증 실패: ${result.error.message.slice(0, 300)}`);
  }
  return result.data;
}

export async function streamLLMText(options: LLMOptions): Promise<ReadableStream<Uint8Array>> {
  const { cfg, model } = await resolveModelAndConfig(options);

  const res = await requestGemini(cfg, model, 'streamGenerateContent', buildRequestBody(options));

  if (!res.body) {
    throw new Error(`Gemini stream error ${res.status}: `);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const chunk = JSON.parse(payload);
              const text = extractText(chunk);
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // 개별 SSE 청크 파싱 실패는 무시하고 계속 진행
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}

/**
 * 스트림 전체를 소비해 문자열로 수집 (캐시/후처리용).
 */
export async function collectStreamText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
}
