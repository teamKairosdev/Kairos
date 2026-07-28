import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText, type LanguageModel } from 'ai';

export interface LLMOptions {
  instructions?: string;
  prompt: string;
  temperature?: number;
}

export function isDemoMode(): boolean {
  const config = useRuntimeConfig();
  const openaiKey = config.openaiApiKey || process.env.OPENAI_API_KEY || '';
  const anthropicKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '';
  const googleKey = config.googleApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';

  const hasOpenAI = openaiKey.trim() !== '' && !openaiKey.includes('your-openai') && !openaiKey.includes('sk-proj-your');
  const hasAnthropic = anthropicKey.trim() !== '' && !anthropicKey.includes('your-anthropic') && !anthropicKey.includes('sk-ant-your');
  const hasGoogle = googleKey.trim() !== '' && !googleKey.includes('your-google') && !googleKey.includes('AIzaSy-your');

  return !hasOpenAI && !hasAnthropic && !hasGoogle;
}

export function getPreferredLanguageModel(): LanguageModel {
  const config = useRuntimeConfig();

  const anthropicKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '';
  if (anthropicKey && anthropicKey.trim() !== '' && !anthropicKey.includes('your-anthropic') && !anthropicKey.includes('sk-ant-your')) {
    const anthropic = createAnthropic({ apiKey: anthropicKey });
    return anthropic('claude-haiku-4-5-20251001');
  }

  const openaiKey = config.openaiApiKey || process.env.OPENAI_API_KEY || '';
  if (openaiKey && openaiKey.trim() !== '' && !openaiKey.includes('your-openai') && !openaiKey.includes('sk-proj-your')) {
    const openai = createOpenAI({ apiKey: openaiKey });
    return openai('gpt-4.1-mini');
  }

  const googleKey = config.googleApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
  if (googleKey && googleKey.trim() !== '' && !googleKey.includes('your-google') && !googleKey.includes('AIzaSy-your')) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    return google('gemini-3.5-flash');
  }

  const openai = createOpenAI({ apiKey: openaiKey || 'fallback-key' });
  return openai('gpt-4.1-mini');
}

export function getModelForComplexity(complexity: 'low' | 'medium' | 'high'): LanguageModel {
  const config = useRuntimeConfig();

  if (complexity === 'high') {
    const anthropicKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '';
    if (anthropicKey && anthropicKey.trim() !== '' && !anthropicKey.includes('your-anthropic')) {
      return createAnthropic({ apiKey: anthropicKey })('claude-sonnet-4-6-20250514');
    }
    const openaiKey = config.openaiApiKey || process.env.OPENAI_API_KEY || '';
    if (openaiKey && openaiKey.trim() !== '' && !openaiKey.includes('your-openai')) {
      return createOpenAI({ apiKey: openaiKey })('gpt-4.1');
    }
  }

  if (complexity === 'medium') {
    const anthropicKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '';
    if (anthropicKey && anthropicKey.trim() !== '' && !anthropicKey.includes('your-anthropic')) {
      return createAnthropic({ apiKey: anthropicKey })('claude-haiku-4-5-20251001');
    }
  }

  return getPreferredLanguageModel();
}

// v7: system → instructions
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

// v7: generateObject removed — use generateText with output
export async function callLLMStructured<T>(options: LLMOptions & { schema: any }): Promise<T> {
  const model = getPreferredLanguageModel();
  const result = await generateText({
    model,
    instructions: options.instructions,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.3,
    output: options.schema,
  });
  return result.output as T;
}

// v7: system → instructions
export async function streamLLMText(options: LLMOptions) {
  const model = getPreferredLanguageModel();
  return streamText({
    model,
    instructions: options.instructions,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.7,
  });
}
