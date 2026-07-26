import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, generateObject, streamText, LanguageModelV1 } from 'ai';

export interface LLMOptions {
  system?: string;
  prompt: string;
  temperature?: number;
}

/** API 키가 없을 때 데모 모드 여부를 감지합니다 */
export function isDemoMode(): boolean {
  const openaiKey = process.env.OPENAI_API_KEY || '';
  const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || '';

  const hasOpenAI = openaiKey.trim() !== '' && !openaiKey.includes('your-openai') && !openaiKey.includes('sk-proj-your');
  const hasAnthropic = anthropicKey.trim() !== '' && !anthropicKey.includes('your-anthropic') && !anthropicKey.includes('sk-ant-your');
  const hasGoogle = googleKey.trim() !== '' && !googleKey.includes('your-google') && !googleKey.includes('AIzaSy-your');

  return !hasOpenAI && !hasAnthropic && !hasGoogle;
}

export function getPreferredLanguageModel(): LanguageModelV1 {
  const config = useRuntimeConfig();
  
  const openaiKey = process.env.OPENAI_API_KEY || config.openaiApiKey;
  if (openaiKey && openaiKey.trim() !== '' && !openaiKey.includes('your-openai')) {
    const openai = createOpenAI({ apiKey: openaiKey });
    return openai('gpt-4o-mini');
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY || config.anthropicApiKey;
  if (anthropicKey && anthropicKey.trim() !== '' && !anthropicKey.includes('your-anthropic')) {
    const anthropic = createAnthropic({ apiKey: anthropicKey });
    return anthropic('claude-3-5-haiku-20241022');
  }

  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || config.googleApiKey;
  if (googleKey && googleKey.trim() !== '' && !googleKey.includes('your-google')) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    return google('gemini-1.5-flash');
  }

  // Fallback default: OpenAI instance with env or process key
  const openai = createOpenAI({ apiKey: openaiKey || 'fallback-key' });
  return openai('gpt-4o-mini');
}

// Single function = Single LLM call (generateText)
export async function callLLMText(options: LLMOptions): Promise<string> {
  const model = getPreferredLanguageModel();
  const result = await generateText({
    model,
    system: options.system,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.7,
  });
  return result.text;
}

// Single function = Single LLM call (generateObject for structured output)
export async function callLLMStructured<T>(options: LLMOptions & { schema: any }): Promise<T> {
  const model = getPreferredLanguageModel();
  const result = await generateObject({
    model,
    schema: options.schema,
    system: options.system,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.3,
  });
  return result.object as T;
}

// SSE Streaming Interview Support
export async function streamLLMText(options: LLMOptions) {
  const model = getPreferredLanguageModel();
  return streamText({
    model,
    system: options.system,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.7,
  });
}
