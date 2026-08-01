/**
 * LLM service ported from server/services/llm.ts
 * useRuntimeConfig() → process.env 직접 접근으로 변환 (Next.js)
 */
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText, Output, type LanguageModel } from 'ai';
import { getSystemConfig } from './systemConfig';

export interface LLMOptions {
  instructions?: string;
  prompt: string;
  temperature?: number;
  model?: string;
}

async function getConfig() {
  const googleKey =
    (await getSystemConfig('GOOGLE_GENERATIVE_AI_API_KEY')) ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    '';
  const gatewayUrl =
    (await getSystemConfig('VERCEL_AI_GATEWAY_URL')) ||
    process.env.VERCEL_AI_GATEWAY_URL ||
    '';
  const gatewayKey =
    (await getSystemConfig('VERCEL_AI_GATEWAY_KEY')) ||
    process.env.VERCEL_AI_GATEWAY_KEY ||
    '';

  return { googleKey, gatewayUrl, gatewayKey };
}

export async function getGeminiModel(
  modelName = 'gemini-2.0-flash-001'
): Promise<any> {
  const { googleKey } = await getConfig();
  if (!googleKey || googleKey.includes('your')) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다.');
  }
  const google = createGoogleGenerativeAI({ apiKey: googleKey });
  return google(modelName) as any;
}

export async function getGatewayModel(
  modelIdentifier = 'google/gemini-2.0-flash-001'
): Promise<any> {
  const { gatewayUrl, gatewayKey } = await getConfig();

  if (!gatewayUrl) return getGeminiModel();

  const headers: Record<string, string> = {};
  if (gatewayKey) {
    headers['x-vercel-ai-gateway-key'] = gatewayKey;
    headers['Authorization'] = `Bearer ${gatewayKey}`;
  }

  const google = createGoogleGenerativeAI({
    baseURL: gatewayUrl.replace(/\/$/, ''),
    headers,
  });

  return google(modelIdentifier) as any;
}

export async function getPreferredLanguageModel(
  requestedModel?: string
): Promise<any> {
  const { gatewayUrl } = await getConfig();
  if (gatewayUrl) {
    return getGatewayModel(requestedModel || 'google/gemini-2.0-flash-001');
  }
  return getGeminiModel(requestedModel || 'gemini-2.0-flash-001');
}

export async function callLLMText(options: LLMOptions): Promise<string> {
  const model = await getPreferredLanguageModel(options.model);
  const result = await generateText({
    model,
    system: options.instructions,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.7,
  });
  return result.text;
}

export async function callLLMStructured<T>(
  options: LLMOptions & { schema: any }
): Promise<T> {
  const { generateObject } = await import('ai');
  const model = await getPreferredLanguageModel(options.model);
  const result = await generateObject({
    model,
    system: options.instructions,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.3,
    schema: options.schema,
  });
  return result.object as T;
}

export async function streamLLMText(options: LLMOptions) {
  const model = await getPreferredLanguageModel(options.model);
  return streamText({
    model,
    system: options.instructions,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.7,
  });
}

export async function getModelForComplexity(
  complexity: 'low' | 'medium' | 'high' | string = 'medium'
): Promise<any> {
  const modelName = 'gemini-2.0-flash-001';
  return getPreferredLanguageModel(modelName);
}
