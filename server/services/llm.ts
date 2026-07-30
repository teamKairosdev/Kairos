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
  const config = useRuntimeConfig();
  const googleKey = (await getSystemConfig('GOOGLE_GENERATIVE_AI_API_KEY')) || (config.googleApiKey as string) || '';
  const gatewayUrl = (await getSystemConfig('VERCEL_AI_GATEWAY_URL')) || (config.vercelAiGatewayUrl as string) || '';
  const gatewayKey = (await getSystemConfig('VERCEL_AI_GATEWAY_KEY')) || (config.vercelAiGatewayKey as string) || '';

  return { googleKey, gatewayUrl, gatewayKey };
}

/**
 * 1. 자체 Google Gemini API 연동부
 * Gemini API Key를 사용하여 Google Direct Provider 반환
 */
export async function getGeminiModel(modelName: string = 'gemini-2.0-flash-001'): Promise<LanguageModel> {
  const { googleKey } = await getConfig();
  if (!googleKey || googleKey.includes('your')) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다.');
  }

  const google = createGoogleGenerativeAI({ apiKey: googleKey });
  return google(modelName);
}

/**
 * 2. Vercel AI Gateway 연동부
 * 단일 Gateway 엔드포인트를 경유하여 다양한 AI 모델 (provider/model) 다중 라우팅 지원
 */
export async function getGatewayModel(modelIdentifier: string = 'google/gemini-2.0-flash-001'): Promise<LanguageModel> {
  const { gatewayUrl, gatewayKey } = await getConfig();

  if (!gatewayUrl) {
    return getGeminiModel();
  }

  const headers: Record<string, string> = {};
  if (gatewayKey) {
    headers['x-vercel-ai-gateway-key'] = gatewayKey;
    headers['Authorization'] = `Bearer ${gatewayKey}`;
  }

  const google = createGoogleGenerativeAI({
    baseURL: gatewayUrl.replace(/\/$/, ''),
    headers,
  });

  return google(modelIdentifier);
}

/**
 * 기본 모델선택기: Vercel AI Gateway 설정 시 Gateway 경유, 미설정 시 자체 Gemini API 직접 연결
 */
export async function getPreferredLanguageModel(requestedModel?: string): Promise<LanguageModel> {
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
    instructions: options.instructions,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.7,
  });
  return result.text;
}

export async function callLLMStructured<T>(options: LLMOptions & { schema: Record<string, unknown> }): Promise<T> {
  const model = await getPreferredLanguageModel(options.model);
  const result = await generateText({
    model,
    instructions: options.instructions,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.3,
    output: Output.object({ schema: options.schema as Parameters<typeof Output.object>[0]['schema'] }),
  });
  return result.output as T;
}

export async function streamLLMText(options: LLMOptions) {
  const model = await getPreferredLanguageModel(options.model);
  return streamText({
    model,
    instructions: options.instructions,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.7,
  });
}
