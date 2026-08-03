import { fetchWithTimeout } from '../http';
import {
  normalizeProviderError,
  providerErrorForStatus,
  ProviderError,
} from './errors';
import { parseJsonText, zodToJsonSchema } from './schema';
import type {
  ExternalAgentAdapter,
  ExternalAgentProviderId,
  ModelProviderAdapter,
  ModelProviderId,
  ProviderAuth,
  ProviderHealthResult,
  ProviderLicenseMetadata,
  ProviderRequestOptions,
  StructuredProviderRequest,
  ProviderMessage,
} from './types';
import type { ZodType } from 'zod';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_MODEL_NAME_LENGTH = 200;

export interface OpenAICompatibleConfig {
  id: string;
  name: string;
  baseUrl: string;
  auth?: ProviderAuth;
  model: string | null;
  enabled: boolean;
  license: ProviderLicenseMetadata;
  capabilities: readonly ('text' | 'structured' | 'stream' | 'coding')[];
  maxOutputTokens: number;
  chatPath?: string;
  healthPath?: string;
  responseFormat?: 'json-schema' | 'json-object';
}

interface OpenAIChatResponse {
  choices?: Array<{
    message?: { content?: unknown };
    text?: unknown;
  }>;
}

function validModelName(model: string): string {
  const normalized = model.trim();
  if (!normalized || normalized.length > MAX_MODEL_NAME_LENGTH || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new ProviderError('Provider model is invalid.', 'CONFIGURATION_REQUIRED', 'provider', 503);
  }
  return normalized;
}

function contentText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value
    .map((part) => {
      if (typeof part === 'string') return part;
      if (typeof part === 'object' && part !== null && 'text' in part) {
        const text = (part as { text?: unknown }).text;
        return typeof text === 'string' ? text : '';
      }
      return '';
    })
    .join('');
}

function modelMessages(options: ProviderRequestOptions): ProviderMessage[] {
  const messages: ProviderMessage[] = [];
  if (options.instructions?.trim()) messages.push({ role: 'system', content: options.instructions.trim() });
  for (const message of options.messages || []) {
    if (!message || !message.content.trim()) continue;
    messages.push({
      role: message.role,
      content: message.content,
    });
  }
  if (options.prompt !== undefined) messages.push({ role: 'user', content: options.prompt });
  if (messages.length === 0) messages.push({ role: 'user', content: '' });
  return messages;
}

function outputCharacterLimit(maxOutputTokens: number): number {
  return Math.max(4, Math.min(131_072, maxOutputTokens * 4));
}

function safeOutput(text: string, maxOutputTokens: number, providerId: string): string {
  if (new TextEncoder().encode(text).byteLength > outputCharacterLimit(maxOutputTokens)) {
    throw new ProviderError('Provider output limit exceeded.', 'OUTPUT_LIMIT_EXCEEDED', providerId, 502);
  }
  return text;
}

function endpoint(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function authHeaders(auth: ProviderAuth | undefined): Record<string, string> {
  if (!auth || auth.type === 'none') return {};
  if (auth.type === 'bearer') return { Authorization: `Bearer ${auth.token}` };
  if (auth.type === 'api-key') return { 'X-API-Key': auth.token };
  return {
    Authorization: `Basic ${Buffer.from(`${auth.username}:${auth.password}`, 'utf8').toString('base64')}`,
  };
}

function maxTokens(options: ProviderRequestOptions, configuredMax: number): number {
  const requested = options.maxOutputTokens;
  if (requested === undefined) return configuredMax;
  if (!Number.isFinite(requested)) return configuredMax;
  return Math.min(configuredMax, Math.max(1, Math.floor(requested)));
}

function structuredInstruction(schema: Record<string, unknown>): string {
  return `Return only valid JSON matching this schema. Do not wrap it in Markdown fences. Schema: ${JSON.stringify(schema)}`;
}

function parseStreamPayload(payload: string): { text: string; done: boolean; error: boolean } {
  if (payload === '[DONE]') return { text: '', done: true, error: false };
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    if (parsed.error) return { text: '', done: false, error: true };
    const choices = Array.isArray(parsed.choices) ? parsed.choices : [];
    const first = choices[0] as Record<string, unknown> | undefined;
    const delta = first && typeof first.delta === 'object' && first.delta !== null ? first.delta : undefined;
    const message = first && typeof first.message === 'object' && first.message !== null ? first.message : undefined;
    const value = delta && 'content' in delta ? delta.content : message && 'content' in message ? message.content : first?.text;
    return { text: contentText(value), done: false, error: false };
  } catch {
    return { text: '', done: false, error: false };
  }
}

async function readWithTimeout<T>(
  reader: ReadableStreamDefaultReader<T>,
  timeoutMs: number,
  providerId: string,
): Promise<ReadableStreamReadResult<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<ReadableStreamReadResult<T>>((_, reject) => {
        timer = setTimeout(() => reject(new ProviderError('Provider stream timed out.', 'TIMEOUT', providerId, 504)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class OpenAICompatibleClient {
  constructor(protected readonly config: OpenAICompatibleConfig) {}

  getConfiguredModel(): string | null {
    return this.config.model;
  }

  private requestHeaders(): Record<string, string> {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...authHeaders(this.config.auth),
    };
  }

  private async request(
    path: string,
    init: RequestInit,
    timeoutMs: number,
  ): Promise<Response> {
    try {
      const response = await fetchWithTimeout(endpoint(this.config.baseUrl, path), {
        ...init,
        redirect: 'error',
        headers: {
          ...this.requestHeaders(),
          ...(init.headers || {}),
        },
      }, timeoutMs);
      if (!response.ok) throw providerErrorForStatus(this.config.id, response.status);
      return response;
    } catch (error) {
      throw normalizeProviderError(error, this.config.id);
    }
  }

  private body(options: ProviderRequestOptions, stream: boolean, schema?: ZodType<unknown>): Record<string, unknown> {
    const messages = modelMessages(options);
    const body: Record<string, unknown> = {
      model: validModelName(options.model || this.config.model || 'default'),
      messages,
      stream,
      temperature: options.temperature ?? 0.7,
      max_tokens: maxTokens(options, this.config.maxOutputTokens),
    };

    if (schema) {
      const schemaJson = zodToJsonSchema(schema);
      if (this.config.responseFormat === 'json-object') {
        body.response_format = { type: 'json_object' };
      } else {
        body.response_format = {
          type: 'json_schema',
          json_schema: { name: 'kairos_response', strict: true, schema: schemaJson },
        };
      }
      const systemMessage = messages.find((message) => message.role === 'system');
      const instruction = structuredInstruction(schemaJson);
      if (systemMessage) systemMessage.content = `${systemMessage.content}\n${instruction}`;
      else body.messages = [{ role: 'system', content: instruction }, ...messages];
    }
    return body;
  }

  async generateText(options: ProviderRequestOptions): Promise<string> {
    const response = await this.request(
      this.config.chatPath || '/chat/completions',
      { method: 'POST', body: JSON.stringify(this.body(options, false)) },
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    let payload: OpenAIChatResponse;
    try {
      payload = (await response.json()) as OpenAIChatResponse;
    } catch {
      throw new ProviderError('Provider returned invalid JSON.', 'INVALID_RESPONSE', this.config.id, 502);
    }
    const first = payload?.choices?.[0];
    const text = contentText(first?.message?.content ?? first?.text);
    if (!text) throw new ProviderError('Provider returned an empty response.', 'INVALID_RESPONSE', this.config.id, 502);
    return safeOutput(text, maxTokens(options, this.config.maxOutputTokens), this.config.id);
  }

  async generateStructured<T>(options: StructuredProviderRequest<T>): Promise<T> {
    const response = await this.request(
      this.config.chatPath || '/chat/completions',
      { method: 'POST', body: JSON.stringify(this.body(options, false, options.schema as ZodType<unknown>)) },
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    let payload: OpenAIChatResponse;
    try {
      payload = (await response.json()) as OpenAIChatResponse;
    } catch {
      throw new ProviderError('Provider returned invalid JSON.', 'INVALID_RESPONSE', this.config.id, 502);
    }
    const text = contentText(payload?.choices?.[0]?.message?.content ?? payload?.choices?.[0]?.text);
    if (!text) throw new ProviderError('Provider returned an empty response.', 'INVALID_RESPONSE', this.config.id, 502);
    let parsed: unknown;
    try {
      parsed = parseJsonText(safeOutput(text, maxTokens(options, this.config.maxOutputTokens), this.config.id));
    } catch {
      throw new ProviderError('Provider returned invalid structured JSON.', 'INVALID_RESPONSE', this.config.id, 502);
    }
    const result = options.schema.safeParse(parsed);
    if (!result.success) throw new ProviderError('Provider structured response failed validation.', 'INVALID_RESPONSE', this.config.id, 502);
    return result.data;
  }

  async streamText(options: ProviderRequestOptions): Promise<ReadableStream<Uint8Array>> {
    const response = await this.request(
      this.config.chatPath || '/chat/completions',
      { method: 'POST', body: JSON.stringify(this.body(options, true)) },
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    if (!response.body) throw new ProviderError('Provider returned no stream body.', 'INVALID_RESPONSE', this.config.id, 502);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxBytes = outputCharacterLimit(maxTokens(options, this.config.maxOutputTokens));
    const providerId = this.config.id;
    let buffer = '';
    let totalBytes = 0;

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (text: string) => {
          if (!text) return;
          const bytes = encoder.encode(text);
          totalBytes += bytes.byteLength;
          if (totalBytes > maxBytes) throw new ProviderError('Provider output limit exceeded.', 'OUTPUT_LIMIT_EXCEEDED', providerId, 502);
          controller.enqueue(bytes);
        };

        const processLine = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) return false;
          const payload = trimmed.slice(5).trim();
          if (!payload) return false;
          const parsed = parseStreamPayload(payload);
          if (parsed.error) throw new ProviderError('Provider returned a stream error.', 'UPSTREAM_ERROR', providerId, 502);
          emit(parsed.text);
          return parsed.done;
        };

        try {
          while (true) {
            const { done, value } = await readWithTimeout(reader, timeoutMs, providerId);
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';
            let streamDone = false;
            for (const line of lines) {
              if (processLine(line)) streamDone = true;
            }
            if (streamDone) break;
          }
          buffer += decoder.decode();
          if (buffer.trim()) processLine(buffer);
          controller.close();
        } catch (error) {
          controller.error(normalizeProviderError(error, providerId));
          await reader.cancel().catch(() => undefined);
        }
      },
      cancel() {
        reader.cancel().catch(() => undefined);
      },
    });
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    try {
      const response = await this.request(this.config.healthPath || '/models', { method: 'GET' }, DEFAULT_TIMEOUT_MS);
      if (response.body) await response.body.cancel().catch(() => undefined);
      return { status: 'healthy' };
    } catch (error) {
      const normalized = normalizeProviderError(error, this.config.id);
      return { status: 'unhealthy', errorCode: normalized.code };
    }
  }
}

export class OpenAICompatibleModelProviderAdapter implements ModelProviderAdapter {
  readonly id: ModelProviderId;
  readonly kind = 'model' as const;
  readonly name: string;
  readonly capabilities: readonly ('text' | 'structured' | 'stream' | 'coding')[];
  readonly enabled: boolean;
  readonly license: ProviderLicenseMetadata;
  private readonly client: OpenAICompatibleClient;

  constructor(config: OpenAICompatibleConfig) {
    this.id = config.id as ModelProviderId;
    this.name = config.name;
    this.capabilities = config.capabilities;
    this.enabled = config.enabled;
    this.license = config.license;
    this.client = new OpenAICompatibleClient(config);
  }

  getDefaultModel(requestedModel?: string): Promise<string> {
    return Promise.resolve(validModelName(requestedModel || this.client.getConfiguredModel() || 'default'));
  }

  generateText(options: ProviderRequestOptions): Promise<string> {
    return this.client.generateText(options);
  }

  generateStructured<T>(options: StructuredProviderRequest<T>): Promise<T> {
    return this.client.generateStructured(options);
  }

  streamText(options: ProviderRequestOptions): Promise<ReadableStream<Uint8Array>> {
    return this.client.streamText(options);
  }

  healthCheck(): Promise<ProviderHealthResult> {
    return this.client.healthCheck();
  }
}

export class OpenAICompatibleExternalAgentAdapter implements ExternalAgentAdapter {
  readonly id: ExternalAgentProviderId;
  readonly kind = 'external-agent' as const;
  readonly name: string;
  readonly capabilities: readonly ('text' | 'structured' | 'stream' | 'coding')[];
  readonly enabled: boolean;
  readonly license: ProviderLicenseMetadata;
  protected readonly client: OpenAICompatibleClient;

  constructor(config: OpenAICompatibleConfig) {
    this.id = config.id as ExternalAgentProviderId;
    this.name = config.name;
    this.capabilities = config.capabilities;
    this.enabled = config.enabled;
    this.license = config.license;
    this.client = new OpenAICompatibleClient(config);
  }

  getDefaultModel(requestedModel?: string): Promise<string> {
    return Promise.resolve(validModelName(requestedModel || this.client.getConfiguredModel() || 'default'));
  }

  generateText(options: ProviderRequestOptions): Promise<string> {
    return this.client.generateText(options);
  }

  generateStructured<T>(options: StructuredProviderRequest<T>): Promise<T> {
    return this.client.generateStructured(options);
  }

  streamText(options: ProviderRequestOptions): Promise<ReadableStream<Uint8Array>> {
    return this.client.streamText(options);
  }

  healthCheck(): Promise<ProviderHealthResult> {
    return this.client.healthCheck();
  }
}
