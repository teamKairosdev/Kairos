import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText, Output, type LanguageModel } from 'ai';

export interface LLMOptions {
  instructions?: string;
  prompt: string;
  temperature?: number;
  model?: string;
}

function getConfig() {
  const config = useRuntimeConfig();
  return {
    googleKey: (config.googleApiKey as string) || '',
    gatewayUrl: (config.vercelAiGatewayUrl as string) || '',
    gatewayKey: (config.vercelAiGatewayKey as string) || '',
  };
}

/**
 * 1. 자체 Google Gemini API 연동부
 * Gemini API Key를 사용하여 Google Direct Provider 반환
 */
export function getGeminiModel(modelName: string = 'gemini-2.0-flash-001'): LanguageModel {
  const { googleKey } = getConfig();
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
export function getGatewayModel(modelIdentifier: string = 'google/gemini-2.0-flash-001'): LanguageModel {
  const { gatewayUrl, gatewayKey } = getConfig();

  if (!gatewayUrl) {
    // Gateway 미설정 시 Direct Gemini로 Fallback
    return getGeminiModel();
  }

  const headers: Record<string, string> = {};
  if (gatewayKey) {
    headers['x-vercel-ai-gateway-key'] = gatewayKey;
    headers['Authorization'] = `Bearer ${gatewayKey}`;
  }

  // Vercel AI Gateway 표준 OpenAI 호환 엔드포인트 생성
  // 특정 모델/프로바이더 전용 경로를 강제하지 않고 단일 Gateway URL로 다양한 모델 다중 라우팅
  const google = createGoogleGenerativeAI({
    baseURL: gatewayUrl.replace(/\/$/, ''),
    headers,
  });

  return google(modelIdentifier);
}

/**
 * 기본 모델선택기: Vercel AI Gateway 설정 시 Gateway 경유, 미설정 시 자체 Gemini API 직접 연결
 */
export function getPreferredLanguageModel(requestedModel?: string): LanguageModel {
  const { gatewayUrl } = getConfig();
  if (gatewayUrl) {
    return getGatewayModel(requestedModel || 'google/gemini-2.0-flash-001');
  }
  return getGeminiModel(requestedModel || 'gemini-2.0-flash-001');
}

export async function callLLMText(options: LLMOptions): Promise<string> {
  const model = getPreferredLanguageModel(options.model);
  const result = await generateText({
    model,
    instructions: options.instructions,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.7,
  });
  return result.text;
}

export async function callLLMStructured<T>(options: LLMOptions & { schema: Record<string, unknown> }): Promise<T> {
  const model = getPreferredLanguageModel(options.model);
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
  const model = getPreferredLanguageModel(options.model);
  return streamText({
    model,
    instructions: options.instructions,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.7,
  });
}
