import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText, Output, type LanguageModel } from 'ai';

export interface LLMOptions {
  instructions?: string;
  prompt: string;
  temperature?: number;
}

function getConfig() {
  const config = useRuntimeConfig();
  return {
    googleKey: config.googleApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || '',
    gatewayUrl: (config as Record<string, string>).vercelAiGatewayUrl || process.env.VERCEL_AI_GATEWAY_URL || '',
  };
}

export function getPreferredLanguageModel(): LanguageModel {
  const { googleKey, gatewayUrl } = getConfig();

  if (googleKey.trim() !== '' && !googleKey.includes('AIzaSy-your')) {
    const opts: Record<string, string> = { apiKey: googleKey };
    if (gatewayUrl) opts.baseURL = `${gatewayUrl}/google`;
    const google = createGoogleGenerativeAI(opts);
    return google('gemini-2.0-flash-001');
  }

  throw new Error('No valid API key configured. Set GOOGLE_GENERATIVE_AI_API_KEY');
}

export async function callLLMText(options: LLMOptions): Promise<string> {
  const model = getPreferredLanguageModel();
  const result = await generateText({
    model,
    instructions: options.instructions,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.7,
  });
  return result.text;
}

export async function callLLMStructured<T>(options: LLMOptions & { schema: Record<string, unknown> }): Promise<T> {
  const model = getPreferredLanguageModel();
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
  const model = getPreferredLanguageModel();
  return streamText({
    model,
    instructions: options.instructions,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.7,
  });
}
