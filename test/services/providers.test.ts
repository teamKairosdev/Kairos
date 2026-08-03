import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { agentRouter } from '../../src/server/agentRouter';
import {
  getPublicProviderConfigs,
  getProviderRuntimeConfig,
} from '../../src/server/providerConfig';
import { OpenAICompatibleModelProviderAdapter } from '../../src/server/providers/openaiCompatible';
import { HermesAgentAdapter, OpenCodeServerAdapter } from '../../src/server/providers/externalAgents';
import {
  isPrivateHost,
  validateProviderUrl,
} from '../../src/server/providers/security';
import type { ProviderLicenseMetadata } from '../../src/server/providers/types';

const originalEnv = { ...process.env };

const license: ProviderLicenseMetadata = {
  provider: null,
  model: null,
  review: 'unreviewed',
  manualReviewRequired: true,
};

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

function compatibleAdapter() {
  return new OpenAICompatibleModelProviderAdapter({
    id: 'generic-openai',
    name: 'Test endpoint',
    baseUrl: 'https://ai.example.test/v1',
    auth: { type: 'bearer', token: 'server-secret' },
    model: 'test-model',
    enabled: true,
    license,
    capabilities: ['text', 'structured', 'stream'],
    maxOutputTokens: 1_024,
    chatPath: '/chat/completions',
    healthPath: '/models',
    responseFormat: 'json-schema',
  });
}

describe('provider endpoint policy', () => {
  it('rejects arbitrary and cloud metadata endpoints', () => {
    expect(validateProviderUrl('https://attacker.example', { requireAllowlist: true, allowedHosts: [] })).toBeNull();
    expect(validateProviderUrl('http://169.254.169.254/latest/meta-data', { allowPrivateNetwork: true })).toBeNull();
    expect(validateProviderUrl('http://127.0.0.1:11434/v1', { requireAllowlist: true, allowedHosts: [] })).toBeNull();
    expect(isPrivateHost('192.168.1.20')).toBe(true);
  });

  it('allows only loopback for local-only providers by default', () => {
    expect(validateProviderUrl('http://127.0.0.1:11434/v1', { localOnly: true })).not.toBeNull();
    expect(validateProviderUrl('http://192.168.1.20:11434/v1', { localOnly: true })).toBeNull();
    expect(
      validateProviderUrl('http://192.168.1.20:11434/v1', {
        localOnly: true,
        allowPrivateNetwork: true,
        allowedHosts: ['192.168.1.20'],
      }),
    ).not.toBeNull();
  });
});

describe('provider configuration', () => {
  it('keeps external agents disabled without explicit enablement', () => {
    vi.stubEnv('HERMES_BASE_URL', 'https://hermes.example.test/v1');
    vi.stubEnv('HERMES_API_KEY', 'hermes-secret');
    vi.stubEnv('OPENCLAW_BASE_URL', 'http://127.0.0.1:18789');
    vi.stubEnv('OPENCLAW_BEARER_TOKEN', 'openclaw-secret');
    vi.stubEnv('OPENCODE_BASE_URL', 'http://127.0.0.1:4096');
    vi.stubEnv('OPENCODE_BEARER_TOKEN', 'opencode-secret');

    expect(getProviderRuntimeConfig('hermes')?.enabled).toBe(false);
    expect(getProviderRuntimeConfig('openclaw')?.enabled).toBe(false);
    expect(getProviderRuntimeConfig('opencode')?.enabled).toBe(false);
  });

  it('requires an allowlisted host for generic endpoints', () => {
    vi.stubEnv('GENERIC_OPENAI_ENABLED', 'true');
    vi.stubEnv('GENERIC_OPENAI_BASE_URL', 'https://generic.example.test/v1');
    vi.stubEnv('GENERIC_OPENAI_API_KEY', 'generic-secret');
    expect(getProviderRuntimeConfig('generic-openai')?.enabled).toBe(false);

    vi.stubEnv('GENERIC_OPENAI_ALLOWED_HOSTS', 'generic.example.test');
    const config = getProviderRuntimeConfig('generic-openai');
    expect(config?.enabled).toBe(true);
    expect(JSON.stringify(getPublicProviderConfigs())).not.toContain('generic-secret');
    expect(JSON.stringify(getPublicProviderConfigs())).not.toContain('generic.example.test');
  });
});

describe('OpenAI-compatible model adapter', () => {
  it('supports text and sends bearer auth without putting the secret in the URL', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.max_tokens).toBe(32);
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer server-secret');
      return new Response(JSON.stringify({ choices: [{ message: { content: 'answer' } }] }), { status: 200 });
    }));

    const result = await compatibleAdapter().generateText({ prompt: 'question', maxOutputTokens: 32 });
    expect(result).toBe('answer');
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).not.toContain('server-secret');
  });

  it('validates structured output and parses a plain text SSE stream', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"hel"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"lo"}}]}\n\ndata: [DONE]\n\n'));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stream, { status: 200 })));
    const adapter = compatibleAdapter();
    const structuredFetch = vi.mocked(fetch);
    structuredFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: '{"score": 5}' } }] }), { status: 200 }),
    );
    await expect(adapter.generateStructured({ prompt: 'score', schema: z.object({ score: z.number() }) })).resolves.toEqual({ score: 5 });

    const reader = (await adapter.streamText({ prompt: 'hello' })).getReader();
    const decoder = new TextDecoder();
    let streamed = '';
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      streamed += decoder.decode(chunk.value);
    }
    expect(streamed).toBe('hello');
  });

  it('normalizes upstream authentication failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('secret upstream detail', { status: 401 })));
    await expect(compatibleAdapter().generateText({ prompt: 'question' })).rejects.toMatchObject({
      name: 'ProviderError',
      code: 'AUTHENTICATION_FAILED',
    });
  });
});

describe('external agent adapters', () => {
  it('uses bearer auth for the Hermes OpenAI-compatible API', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer hermes-secret');
      return new Response(JSON.stringify({ choices: [{ message: { content: 'Hermes result' } }] }), { status: 200 });
    }));
    const adapter = new HermesAgentAdapter({
      id: 'hermes',
      name: 'Hermes',
      kind: 'external-agent',
      capabilities: ['text', 'structured', 'stream'],
      enabled: true,
      model: 'hermes',
      license,
      baseUrl: 'https://hermes.example.test/v1',
      auth: { type: 'bearer', token: 'hermes-secret' },
      chatPath: '/chat/completions',
      healthPath: '/models',
      responseFormat: 'json-schema',
      maxOutputTokens: 1_024,
    });
    await expect(adapter.generateText({ prompt: 'run' })).resolves.toBe('Hermes result');
  });

  it('uses the OpenCode session/message API with basic auth', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'session-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ parts: [{ type: 'text', text: 'code result' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new OpenCodeServerAdapter({
      id: 'opencode',
      name: 'OpenCode',
      kind: 'external-agent',
      capabilities: ['text', 'stream', 'coding'],
      enabled: true,
      model: null,
      license,
      baseUrl: 'http://127.0.0.1:4096',
      auth: { type: 'basic', username: 'opencode', password: 'server-secret' },
      healthPath: '/session',
      maxOutputTokens: 1_024,
    });
    await expect(adapter.generateText({ prompt: 'fix the code' })).resolves.toBe('code result');
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      Authorization: `Basic ${Buffer.from('opencode:server-secret').toString('base64')}`,
    });
    expect(String(fetchMock.mock.calls[1][0])).toContain('/session/session-1/message');
  });
});

describe('agentRouter provider selection', () => {
  it('selects enabled compatible providers and keeps deterministic fallback', () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'openrouter-secret');
    expect(agentRouter({ taskType: 'rewrite', geminiAvailable: false })).toMatchObject({
      provider: 'openrouter',
      providerKind: 'model',
    });

    vi.stubEnv('OPENROUTER_API_KEY', '');
    expect(agentRouter({ taskType: 'rewrite', geminiAvailable: false })).toMatchObject({
      provider: 'local-deterministic',
      fallbackUsed: true,
    });
  });

  it('routes coding only to an explicitly enabled OpenCode server', () => {
    vi.stubEnv('OPENCODE_ENABLED', 'true');
    vi.stubEnv('OPENCODE_BASE_URL', 'http://127.0.0.1:4096');
    vi.stubEnv('OPENCODE_BEARER_TOKEN', 'opencode-secret');
    expect(agentRouter({ taskType: 'coding' })).toMatchObject({
      provider: 'opencode',
      providerKind: 'external-agent',
      capability: 'coding',
    });
    expect(agentRouter({ taskType: 'rewrite' })).not.toMatchObject({ provider: 'opencode' });
  });
});
