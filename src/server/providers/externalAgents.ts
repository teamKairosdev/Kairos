import { fetchWithTimeout } from '../http';
import { ProviderError, normalizeProviderError, providerErrorForStatus } from './errors';
import {
  OpenAICompatibleExternalAgentAdapter,
  type OpenAICompatibleConfig,
} from './openaiCompatible';
import type { ProviderRuntimeConfig } from '../providerConfig';
import type {
  ExternalAgentAdapter,
  ProviderHealthResult,
  ProviderLicenseMetadata,
  ProviderRequestOptions,
  StructuredProviderRequest,
} from './types';

function compatibleConfig(config: ProviderRuntimeConfig): OpenAICompatibleConfig {
  if (!config.baseUrl) throw new ProviderError('Provider endpoint is not configured.', 'CONFIGURATION_REQUIRED', config.id, 503);
  return {
    id: config.id,
    name: config.name,
    baseUrl: config.baseUrl,
    auth: config.auth,
    model: config.model,
    enabled: config.enabled,
    license: config.license,
    capabilities: config.capabilities,
    maxOutputTokens: config.maxOutputTokens,
    chatPath: config.chatPath,
    healthPath: config.healthPath,
    responseFormat: config.responseFormat,
  };
}

export class HermesAgentAdapter extends OpenAICompatibleExternalAgentAdapter {
  constructor(config: ProviderRuntimeConfig) {
    super(compatibleConfig(config));
  }
}

export class OpenClawGatewayAdapter extends OpenAICompatibleExternalAgentAdapter {
  constructor(config: ProviderRuntimeConfig) {
    super(compatibleConfig(config));
  }
}

function opencodeEndpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function opencodeHeaders(config: ProviderRuntimeConfig): Record<string, string> {
  const auth = config.auth;
  if (!auth || auth.type === 'none') return { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (auth.type === 'bearer') {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    };
  }
  if (auth.type === 'basic') {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${auth.username}:${auth.password}`, 'utf8').toString('base64')}`,
    };
  }
  return { Accept: 'application/json', 'Content-Type': 'application/json' };
}

function openCodePrompt(options: ProviderRequestOptions): string {
  const lines: string[] = [];
  if (options.instructions?.trim()) lines.push(options.instructions.trim());
  for (const message of options.messages || []) {
    if (!message.content.trim()) continue;
    lines.push(`${message.role}: ${message.content}`);
  }
  if (options.prompt !== undefined) lines.push(options.prompt);
  const prompt = lines.join('\n\n').trim();
  return prompt || 'Complete the coding task.';
}

function outputLimit(options: ProviderRequestOptions, configured: number): number {
  const tokens = options.maxOutputTokens && Number.isFinite(options.maxOutputTokens)
    ? Math.min(configured, Math.max(1, Math.floor(options.maxOutputTokens)))
    : configured;
  return Math.max(4, Math.min(131_072, tokens * 4));
}

function extractOpenCodeText(value: unknown, depth = 0): string {
  if (depth > 7 || value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((entry) => extractOpenCodeText(entry, depth + 1)).join('');
  }
  if (typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  if (record.type === 'text' && typeof record.text === 'string') return record.text;
  for (const key of ['text', 'content', 'output', 'parts', 'message', 'response']) {
    if (key in record) {
      const text = extractOpenCodeText(record[key], depth + 1);
      if (text) return text;
    }
  }
  return '';
}

async function readJson(response: Response, providerId: string): Promise<unknown> {
  try {
    const body = await response.text();
    return body ? JSON.parse(body) : {};
  } catch {
    throw new ProviderError('Provider returned invalid JSON.', 'INVALID_RESPONSE', providerId, 502);
  }
}

export class OpenCodeServerAdapter implements ExternalAgentAdapter {
  readonly id = 'opencode' as const;
  readonly kind = 'external-agent' as const;
  readonly name = 'OpenCode server';
  readonly capabilities = ['text', 'stream', 'coding'] as const;
  readonly enabled: boolean;
  readonly license: ProviderLicenseMetadata;
  private readonly config: ProviderRuntimeConfig;

  constructor(config: ProviderRuntimeConfig) {
    this.config = config;
    this.enabled = config.enabled;
    this.license = config.license;
  }

  getDefaultModel(requestedModel?: string): Promise<string> {
    return Promise.resolve((requestedModel || this.config.model || '').trim());
  }

  private async request(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    if (!this.config.baseUrl || !this.config.auth) {
      throw new ProviderError('Provider endpoint is not configured.', 'CONFIGURATION_REQUIRED', this.id, 503);
    }
    try {
      const response = await fetchWithTimeout(
        opencodeEndpoint(this.config.baseUrl, path),
        {
          ...init,
          redirect: 'error',
          headers: { ...opencodeHeaders(this.config), ...(init.headers || {}) },
        },
        timeoutMs,
      );
      if (!response.ok) throw providerErrorForStatus(this.id, response.status);
      return response;
    } catch (error) {
      throw normalizeProviderError(error, this.id);
    }
  }

  private async createSession(options: ProviderRequestOptions): Promise<string> {
    const response = await this.request(
      '/session',
      { method: 'POST', body: JSON.stringify({}) },
      options.timeoutMs || 30_000,
    );
    const payload = await readJson(response, this.id);
    if (typeof payload === 'object' && payload !== null && typeof (payload as { id?: unknown }).id === 'string') {
      return (payload as { id: string }).id;
    }
    throw new ProviderError('OpenCode session response is invalid.', 'INVALID_RESPONSE', this.id, 502);
  }

  async generateText(options: ProviderRequestOptions): Promise<string> {
    const sessionId = await this.createSession(options);
    const model = await this.getDefaultModel(options.model);
    const response = await this.request(
      `/session/${encodeURIComponent(sessionId)}/message`,
      {
        method: 'POST',
        body: JSON.stringify({
          parts: [{ type: 'text', text: openCodePrompt(options) }],
          ...(model ? { model } : {}),
        }),
      },
      options.timeoutMs || 30_000,
    );
    const payload = await readJson(response, this.id);
    const text = extractOpenCodeText(payload).trim();
    if (!text) throw new ProviderError('OpenCode returned an empty response.', 'INVALID_RESPONSE', this.id, 502);
    if (new TextEncoder().encode(text).byteLength > outputLimit(options, this.config.maxOutputTokens)) {
      throw new ProviderError('Provider output limit exceeded.', 'OUTPUT_LIMIT_EXCEEDED', this.id, 502);
    }
    return text;
  }

  async generateStructured<T>(options: StructuredProviderRequest<T>): Promise<T> {
    void options;
    throw new ProviderError('OpenCode supports coding tasks only.', 'UNSUPPORTED_CAPABILITY', this.id, 400);
  }

  async streamText(options: ProviderRequestOptions): Promise<ReadableStream<Uint8Array>> {
    const text = await this.generateText(options);
    const bytes = new TextEncoder().encode(text);
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    try {
      const response = await this.request(this.config.healthPath || '/session', { method: 'GET' }, 30_000);
      if (response.body) await response.body.cancel().catch(() => undefined);
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', errorCode: normalizeProviderError(error, this.id).code };
    }
  }
}

export function externalAgentConfig(config: ProviderRuntimeConfig): OpenAICompatibleConfig {
  return compatibleConfig(config);
}
