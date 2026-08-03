/**
 * LLM service facade. Gemini remains the native default path, while the
 * provider registry can select an enabled compatible model adapter.
 */
import { z } from 'zod';
import { ProviderError } from './providers/errors';
import { GeminiNativeAdapter } from './providers/gemini';
import { getModelProviderAdapter } from './providers';
import type { ModelProviderId, ProviderMessage } from './providers/types';

export interface LLMMessage {
  role: 'user' | 'model';
  content: string;
}

/** Client UI message shape accepted by the LLM routes. */
export interface GeminiInputMessage {
  role?: string;
  content?: string;
  parts?: { type?: string; text?: string }[];
}

export interface LLMOptions {
  instructions?: string;
  prompt?: string;
  temperature?: number;
  model?: string;
  messages?: LLMMessage[];
  provider?: ModelProviderId;
  timeoutMs?: number;
  maxOutputTokens?: number;
}

export const DEFAULT_MODEL = 'gemini-2.0-flash-001';
export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const LLM_REQUEST_TIMEOUT_MS = 30_000;

/** UIMessage: {role, content|parts} -> normalized provider messages. */
export function toGeminiMessages(messages: unknown[] | undefined): LLMMessage[] {
  const result: LLMMessage[] = [];
  for (const raw of messages ?? []) {
    const message = raw as GeminiInputMessage;
    if (!message) continue;
    const role = message.role === 'user' ? 'user' : 'model';
    let content = '';
    if (typeof message.content === 'string') {
      content = message.content;
    } else if (Array.isArray(message.parts)) {
      content = message.parts
        .filter((part) => part?.type === 'text' || typeof part?.text === 'string')
        .map((part) => part.text ?? '')
        .join('');
    }
    if (!content.trim()) continue;
    result.push({ role, content });
  }
  return result;
}

function providerMessages(messages: LLMMessage[] | undefined): ProviderMessage[] {
  return (messages || []).map((message) => ({
    role: message.role === 'model' ? 'assistant' : 'user',
    content: message.content,
  }));
}

function resolveModelAdapter(provider?: ModelProviderId) {
  const adapter = getModelProviderAdapter(provider);
  if (adapter) return adapter;
  if (provider) throw new ProviderError('Requested model provider is disabled.', 'CONFIGURATION_REQUIRED', provider, 503);
  // Preserve the old Gemini error and DB-backed system-config behavior when
  // no environment-configured external model is available.
  return new GeminiNativeAdapter();
}

function providerOptions(options: LLMOptions) {
  return {
    instructions: options.instructions,
    prompt: options.prompt,
    temperature: options.temperature,
    model: options.model,
    messages: providerMessages(options.messages),
    timeoutMs: options.timeoutMs ?? LLM_REQUEST_TIMEOUT_MS,
    maxOutputTokens: options.maxOutputTokens,
  };
}

export async function getPreferredLanguageModel(requestedModel?: string): Promise<string> {
  return resolveModelAdapter().getDefaultModel(requestedModel);
}

export async function callLLMText(options: LLMOptions): Promise<string> {
  return resolveModelAdapter(options.provider).generateText(providerOptions(options));
}

export async function callLLMStructured<T>(
  options: LLMOptions & { schema: z.ZodType<T> },
): Promise<T> {
  return resolveModelAdapter(options.provider).generateStructured({
    ...providerOptions({ ...options, temperature: options.temperature ?? 0.3 }),
    schema: options.schema,
  });
}

export async function streamLLMText(options: LLMOptions): Promise<ReadableStream<Uint8Array>> {
  return resolveModelAdapter(options.provider).streamText(providerOptions(options));
}

/** Consume a text stream for caching or post-processing. */
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
