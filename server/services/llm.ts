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

function getKeys() {
  const config = useRuntimeConfig();
  return {
    anthropic: config.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '',
    openai: config.openaiApiKey || process.env.OPENAI_API_KEY || '',
    google: config.googleApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
  };
}

function isValidKey(key: string): boolean {
  return key.trim() !== '' && !key.includes('your-') && !key.includes('sk-proj-your') && !key.includes('sk-ant-your') && !key.includes('AIzaSy-your');
}

/** Pick the first available provider name */
function pickProvider(): { provider: 'anthropic' | 'openai' | 'google'; key: string } | null {
  const keys = getKeys();
  if (isValidKey(keys.anthropic)) return { provider: 'anthropic', key: keys.anthropic };
  if (isValidKey(keys.openai)) return { provider: 'openai', key: keys.openai };
  if (isValidKey(keys.google)) return { provider: 'google', key: keys.google };
  return null;
}

/* ── AI SDK path ── */

export function getPreferredLanguageModel(): LanguageModel {
  const config = useRuntimeConfig();

  const anthropicKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '';
  if (isValidKey(anthropicKey)) {
    const anthropic = createAnthropic({ apiKey: anthropicKey });
    return anthropic('claude-haiku-4-5-20251001');
  }

  const openaiKey = config.openaiApiKey || process.env.OPENAI_API_KEY || '';
  if (isValidKey(openaiKey)) {
    const openai = createOpenAI({ apiKey: openaiKey });
    return openai('gpt-4.1-mini');
  }

  const googleKey = config.googleApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
  if (isValidKey(googleKey)) {
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
    if (isValidKey(anthropicKey)) {
      return createAnthropic({ apiKey: anthropicKey })('claude-sonnet-4-6-20250514');
    }
    const openaiKey = config.openaiApiKey || process.env.OPENAI_API_KEY || '';
    if (isValidKey(openaiKey)) {
      return createOpenAI({ apiKey: openaiKey })('gpt-4.1');
    }
  }

  if (complexity === 'medium') {
    const anthropicKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '';
    if (isValidKey(anthropicKey)) {
      return createAnthropic({ apiKey: anthropicKey })('claude-haiku-4-5-20251001');
    }
  }

  return getPreferredLanguageModel();
}

/* ── Raw API path (fallback when AI SDK fails) ── */

async function callLLMTextRaw(options: LLMOptions): Promise<string> {
  const picked = pickProvider();
  if (!picked) throw new Error('No valid API key configured');

  const body: Record<string, any> = {
    temperature: options.temperature ?? 0.7,
    max_tokens: 4096,
  };

  if (picked.provider === 'anthropic') {
    const messages: any[] = [];
    if (options.instructions) messages.push({ role: 'user', content: options.instructions });
    messages.push({ role: 'user', content: options.prompt });

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': picked.key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ ...body, model: 'claude-haiku-4-5-20251001', max_tokens: 4096, messages }),
    });
    if (!resp.ok) throw new Error(`Anthropic raw API error: ${resp.status}`);
    const json = await resp.json();
    return json.content?.[0]?.text || '';
  }

  if (picked.provider === 'openai') {
    const messages: any[] = [];
    if (options.instructions) messages.push({ role: 'system', content: options.instructions });
    messages.push({ role: 'user', content: options.prompt });

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${picked.key}` },
      body: JSON.stringify({ ...body, model: 'gpt-4.1-mini', messages }),
    });
    if (!resp.ok) throw new Error(`OpenAI raw API error: ${resp.status}`);
    const json = await resp.json();
    return json.choices?.[0]?.message?.content || '';
  }

  if (picked.provider === 'google') {
    const contents: any[] = [];
    if (options.instructions) contents.push({ role: 'user', parts: [{ text: options.instructions }] });
    contents.push({ role: 'user', parts: [{ text: options.prompt }] });

    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${picked.key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });
    if (!resp.ok) throw new Error(`Google raw API error: ${resp.status}`);
    const json = await resp.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  throw new Error('No supported provider for raw API call');
}

/* ── Exported functions (SDK + raw fallback) ── */

export async function callLLMText(options: LLMOptions): Promise<string> {
  try {
    const model = getPreferredLanguageModel();
    const result = await generateText({
      model,
      instructions: options.instructions,
      prompt: options.prompt,
      temperature: options.temperature ?? 0.7,
      ...(hasAnthropicKey() && { providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } } }),
    });
    return result.text;
  } catch (sdkErr) {
    console.warn('[llm] AI SDK failed, falling back to raw API:', sdkErr);
    return callLLMTextRaw(options);
  }
}

export async function callLLMStructured<T>(options: LLMOptions & { schema: any }): Promise<T> {
  try {
    const model = getPreferredLanguageModel();
    const result = await generateText({
      model,
      instructions: options.instructions,
      prompt: options.prompt,
      temperature: options.temperature ?? 0.3,
      output: options.schema,
      ...(hasAnthropicKey() && { providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } } }),
    });
    return result.output as T;
  } catch (sdkErr) {
    console.warn('[llm] AI SDK failed, falling back to raw API for structured:', sdkErr);
    const text = await callLLMTextRaw({ instructions: options.instructions, prompt: `Return valid JSON:\n${options.prompt}`, temperature: options.temperature ?? 0.3 });
    return JSON.parse(text) as T;
  }
}

export async function streamLLMText(options: LLMOptions) {
  const model = getPreferredLanguageModel();
  return streamText({
    model,
    instructions: options.instructions,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.7,
    ...(hasAnthropicKey() && { providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } } }),
  });
}

function hasAnthropicKey(): boolean {
  const config = useRuntimeConfig();
  const key = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '';
  return isValidKey(key);
}
