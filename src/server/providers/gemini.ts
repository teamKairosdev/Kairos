import { z } from 'zod';
import { getSystemConfig } from '../systemConfig';
import { fetchWithTimeout } from '../http';
import {
  normalizeProviderError,
  ProviderError,
} from './errors';
import { zodToJsonSchema } from './schema';
import type {
  ModelProviderAdapter,
  ProviderHealthResult,
  ProviderLicenseMetadata,
  ProviderRequestOptions,
  StructuredProviderRequest,
} from './types';

export const DEFAULT_MODEL = 'gemini-2.0-flash-001';
export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const LLM_REQUEST_TIMEOUT_MS = 30_000;

interface EndpointConfig {
  apiKey: string;
  baseUrl: string;
  headers: Record<string, string>;
  gatewayUrl: string;
}

interface GeminiResponsePart {
  text?: string;
}

interface GeminiResponseContent {
  parts?: GeminiResponsePart[];
}

interface GeminiResponseCandidate {
  content?: GeminiResponseContent;
  finishReason?: string;
}

interface GeminiGenerateResponse {
  candidates?: GeminiResponseCandidate[];
}

const GEMINI_LICENSE: ProviderLicenseMetadata = {
  provider: null,
  model: null,
  review: 'unreviewed',
  manualReviewRequired: true,
};

async function getConfig(): Promise<EndpointConfig> {
  const [googleKey, gatewayUrl, gatewayKey] = await Promise.all([
    getSystemConfig('GOOGLE_GENERATIVE_AI_API_KEY').then(
      (value) => value || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
    ),
    getSystemConfig('VERCEL_AI_GATEWAY_URL').then(
      (value) => value || process.env.VERCEL_AI_GATEWAY_URL || '',
    ),
    getSystemConfig('VERCEL_AI_GATEWAY_KEY').then(
      (value) => value || process.env.VERCEL_AI_GATEWAY_KEY || '',
    ),
  ]);

  if (!googleKey || googleKey.trim() === '' || googleKey.toLowerCase().includes('your')) {
    throw new ProviderError('GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다.', 'CONFIGURATION_REQUIRED', 'gemini', 503);
  }

  if (gatewayUrl) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (gatewayKey) {
      headers['x-vercel-ai-gateway-key'] = gatewayKey;
      headers.Authorization = `Bearer ${gatewayKey}`;
    }
    return {
      apiKey: googleKey,
      baseUrl: gatewayUrl.replace(/\/$/, ''),
      headers,
      gatewayUrl,
    };
  }

  return {
    apiKey: googleKey,
    baseUrl: GEMINI_BASE_URL,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': googleKey },
    gatewayUrl: '',
  };
}

function modelName(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 200 || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new ProviderError('Provider model is invalid.', 'CONFIGURATION_REQUIRED', 'gemini', 503);
  }
  return normalized;
}

function extractText(payload: GeminiGenerateResponse): string {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('');
}

function buildEndpointUrl(
  config: EndpointConfig,
  model: string,
  action: 'generateContent' | 'streamGenerateContent',
): string {
  const query = action === 'streamGenerateContent' ? '?alt=sse' : '';
  return `${config.baseUrl}/models/${encodeURIComponent(model)}:${action}${query}`;
}

function geminiContents(options: ProviderRequestOptions): { role: 'user' | 'model'; parts: { text: string }[] }[] {
  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  for (const message of options.messages || []) {
    if (!message.content.trim()) continue;
    contents.push({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    });
  }
  if (options.prompt !== undefined) contents.push({ role: 'user', parts: [{ text: options.prompt }] });
  if (contents.length === 0) contents.push({ role: 'user', parts: [{ text: '' }] });
  return contents;
}

function requestBody(options: ProviderRequestOptions, schema?: z.ZodTypeAny): Record<string, unknown> {
  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.7,
  };
  if (options.maxOutputTokens !== undefined) generationConfig.maxOutputTokens = Math.max(1, Math.floor(options.maxOutputTokens));
  if (schema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = zodToJsonSchema(schema);
  }

  const body: Record<string, unknown> = {
    contents: geminiContents(options),
    generationConfig,
  };
  if (options.instructions?.trim()) body.systemInstruction = { parts: [{ text: options.instructions.trim() }] };
  return body;
}

function safeOutput(text: string, maxOutputTokens: number | undefined): string {
  const maxBytes = Math.max(4, Math.min(131_072, (maxOutputTokens ?? 4_096) * 4));
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new ProviderError('Provider output limit exceeded.', 'OUTPUT_LIMIT_EXCEEDED', 'gemini', 502);
  }
  return text;
}

export class GeminiNativeAdapter implements ModelProviderAdapter {
  readonly id = 'gemini' as const;
  readonly kind = 'model' as const;
  readonly name = 'Gemini';
  readonly capabilities = ['text', 'structured', 'stream'] as const;
  readonly license = GEMINI_LICENSE;

  get enabled(): boolean {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || '';
    return Boolean(key) && !key.toLowerCase().includes('your');
  }

  async getDefaultModel(requestedModel?: string): Promise<string> {
    const config = await getConfig();
    if (config.gatewayUrl) return modelName((requestedModel || 'google/gemini-2.0-flash-001').replace(/^google\//, ''));
    return modelName(requestedModel || process.env.GEMINI_MODEL || DEFAULT_MODEL);
  }

  private async resolve(options: ProviderRequestOptions): Promise<{ config: EndpointConfig; model: string }> {
    const config = await getConfig();
    const model = modelName(options.model || (await this.getDefaultModel()));
    return { config, model };
  }

  private async request(
    config: EndpointConfig,
    model: string,
    action: 'generateContent' | 'streamGenerateContent',
    body: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<Response> {
    try {
      const response = await fetchWithTimeout(buildEndpointUrl(config, model, action), {
        method: 'POST',
        redirect: 'error',
        headers: config.headers,
        body: JSON.stringify(body),
      }, timeoutMs);
      if (!response.ok) {
        const message = action === 'streamGenerateContent' ? 'Gemini stream error' : 'Gemini API error';
        throw new ProviderError(`${message} ${response.status}`, 'UPSTREAM_ERROR', 'gemini', response.status);
      }
      return response;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw normalizeProviderError(error, 'gemini');
    }
  }

  async generateText(options: ProviderRequestOptions): Promise<string> {
    const { config, model } = await this.resolve(options);
    const response = await this.request(
      config,
      model,
      'generateContent',
      requestBody(options),
      options.timeoutMs ?? LLM_REQUEST_TIMEOUT_MS,
    );
    let payload: GeminiGenerateResponse;
    try {
      payload = (await response.json()) as GeminiGenerateResponse;
    } catch {
      throw new ProviderError('Gemini returned invalid JSON.', 'INVALID_RESPONSE', 'gemini', 502);
    }
    const text = extractText(payload);
    if (!text) {
      const reason = payload?.candidates?.[0]?.finishReason;
      if (reason === 'SAFETY') throw new ProviderError('LLM 응답이 안전 정책에 의해 차단되었습니다.', 'UPSTREAM_ERROR', 'gemini', 502);
      throw new ProviderError('LLM에서 빈 응답을 받았습니다.', 'INVALID_RESPONSE', 'gemini', 502);
    }
    return safeOutput(text, options.maxOutputTokens);
  }

  async generateStructured<T>(options: StructuredProviderRequest<T>): Promise<T> {
    const { config, model } = await this.resolve(options);
    const response = await this.request(
      config,
      model,
      'generateContent',
      requestBody({ ...options, temperature: options.temperature ?? 0.3 }, options.schema),
      options.timeoutMs ?? LLM_REQUEST_TIMEOUT_MS,
    );
    let payload: GeminiGenerateResponse;
    try {
      payload = (await response.json()) as GeminiGenerateResponse;
    } catch {
      throw new ProviderError('Gemini returned invalid JSON.', 'INVALID_RESPONSE', 'gemini', 502);
    }
    const text = extractText(payload);
    if (!text) throw new ProviderError('LLM 구조화 응답이 비어 있습니다.', 'INVALID_RESPONSE', 'gemini', 502);
    let parsed: unknown;
    try {
      parsed = JSON.parse(safeOutput(text, options.maxOutputTokens));
    } catch {
      throw new ProviderError('LLM 구조화 응답 JSON 파싱 실패.', 'INVALID_RESPONSE', 'gemini', 502);
    }
    const result = options.schema.safeParse(parsed);
    if (!result.success) throw new ProviderError(`LLM 구조화 응답 검증 실패: ${result.error.message.slice(0, 300)}`, 'INVALID_RESPONSE', 'gemini', 502);
    return result.data;
  }

  async streamText(options: ProviderRequestOptions): Promise<ReadableStream<Uint8Array>> {
    const { config, model } = await this.resolve(options);
    const response = await this.request(
      config,
      model,
      'streamGenerateContent',
      requestBody(options),
      options.timeoutMs ?? LLM_REQUEST_TIMEOUT_MS,
    );
    if (!response.body) throw new ProviderError(`Gemini stream error ${response.status}: `, 'INVALID_RESPONSE', 'gemini', 502);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const maxBytes = Math.max(4, Math.min(131_072, (options.maxOutputTokens ?? 4_096) * 4));
    let buffer = '';
    let totalBytes = 0;

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (text: string) => {
          if (!text) return;
          const bytes = encoder.encode(text);
          totalBytes += bytes.byteLength;
          if (totalBytes > maxBytes) throw new ProviderError('Provider output limit exceeded.', 'OUTPUT_LIMIT_EXCEEDED', 'gemini', 502);
          controller.enqueue(bytes);
        };
        const processLine = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) return;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === '[DONE]') return;
          try {
            emit(extractText(JSON.parse(payload) as GeminiGenerateResponse));
          } catch (error) {
            if (error instanceof ProviderError) throw error;
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';
            for (const line of lines) processLine(line);
          }
          buffer += decoder.decode();
          if (buffer.trim()) processLine(buffer);
          controller.close();
        } catch (error) {
          controller.error(normalizeProviderError(error, 'gemini'));
        }
      },
      cancel() {
        reader.cancel().catch(() => undefined);
      },
    });
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    try {
      const config = await getConfig();
      const model = await this.getDefaultModel();
      const response = await fetchWithTimeout(
        `${config.baseUrl}/models/${encodeURIComponent(model)}`,
        { method: 'GET', redirect: 'error', headers: config.headers },
        LLM_REQUEST_TIMEOUT_MS,
      );
      if (!response.ok) return { status: 'unhealthy', errorCode: 'UPSTREAM_ERROR' };
      if (response.body) await response.body.cancel().catch(() => undefined);
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', errorCode: normalizeProviderError(error, 'gemini').code };
    }
  }
}
