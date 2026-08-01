import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'

vi.mock('../../src/server/systemConfig', () => ({
  getSystemConfig: vi.fn(async (key: string) => process.env[key] || ''),
}))

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

function mockFetchJson(payload: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok,
    status,
    text: async () => JSON.stringify(payload),
    json: async () => payload,
  } as any)))
}

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

describe('getPreferredLanguageModel', () => {
  it('returns default Gemini model when Google API key is set', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'AIzaSy-real-key')
    vi.stubEnv('VERCEL_AI_GATEWAY_URL', '')
    const { getPreferredLanguageModel, DEFAULT_MODEL } = await import('../../src/server/llm')
    await expect(getPreferredLanguageModel()).resolves.toBe(DEFAULT_MODEL)
  })

  it('returns gateway model when VERCEL_AI_GATEWAY_URL is set', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'AIzaSy-real-key')
    vi.stubEnv('VERCEL_AI_GATEWAY_URL', 'https://gateway.example.com')
    const { getPreferredLanguageModel } = await import('../../src/server/llm')
    await expect(getPreferredLanguageModel('google/gemini-2.0-flash-001')).resolves.toBe(
      'gemini-2.0-flash-001'
    )
  })

  it('throws when no API key is configured', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '')
    const { getPreferredLanguageModel } = await import('../../src/server/llm')
    await expect(getPreferredLanguageModel()).rejects.toThrow('GOOGLE_GENERATIVE_AI_API_KEY')
  })

  it('rejects placeholder keys', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'AIzaSy-your-google-key')
    const { getPreferredLanguageModel } = await import('../../src/server/llm')
    await expect(getPreferredLanguageModel()).rejects.toThrow('GOOGLE_GENERATIVE_AI_API_KEY')
  })
})

describe('callLLMText', () => {
  it('calls Gemini generateContent and returns extracted text', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'AIzaSy-real-key')
    mockFetchJson({ candidates: [{ content: { parts: [{ text: '응답' }] } }] })
    const { callLLMText } = await import('../../src/server/llm')
    const result = await callLLMText({ instructions: 'Be helpful', prompt: 'Hello' })
    expect(result).toBe('응답')
    const fetchMock = vi.mocked(globalThis.fetch)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('gemini-2.0-flash-001:generateContent')
    expect(String(url)).toContain('key=AIzaSy-real-key')
    expect((init as any).body).toContain('Hello')
  })

  it('throws when response text is empty', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'AIzaSy-real-key')
    mockFetchJson({ candidates: [{ content: { parts: [] } }] })
    const { callLLMText } = await import('../../src/server/llm')
    await expect(callLLMText({ prompt: 'Hello' })).rejects.toThrow('빈 응답')
  })

  it('throws on non-ok response', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'AIzaSy-real-key')
    mockFetchJson({ error: 'boom' }, false, 500)
    const { callLLMText } = await import('../../src/server/llm')
    await expect(callLLMText({ prompt: 'Hello' })).rejects.toThrow('Gemini API error 500')
  })
})

describe('callLLMStructured', () => {
  const schema = z.object({ score: z.number(), label: z.string() })

  it('validates response against zod schema', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'AIzaSy-real-key')
    mockFetchJson({ candidates: [{ content: { parts: [{ text: JSON.stringify({ score: 85, label: 'good' }) }] } }] })
    const { callLLMStructured } = await import('../../src/server/llm')
    const result = await callLLMStructured({ prompt: 'Rate', schema })
    expect(result).toEqual({ score: 85, label: 'good' })
  })

  it('throws when schema validation fails', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'AIzaSy-real-key')
    mockFetchJson({ candidates: [{ content: { parts: [{ text: JSON.stringify({ score: 'high', label: 'x' }) }] } }] })
    const { callLLMStructured } = await import('../../src/server/llm')
    await expect(callLLMStructured({ prompt: 'Rate', schema })).rejects.toThrow('구조화 응답 검증 실패')
  })

  it('throws when response is empty', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'AIzaSy-real-key')
    mockFetchJson({ candidates: [{ content: { parts: [] } }] })
    const { callLLMStructured } = await import('../../src/server/llm')
    await expect(callLLMStructured({ prompt: 'Rate', schema })).rejects.toThrow('구조화 응답이 비어 있습니다')
  })
})

describe('streamLLMText', () => {
  it('parses SSE chunks and returns streamed text', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'AIzaSy-real-key')
    const sse =
      'data: {"candidates":[{"content":{"parts":[{"text":"안녕"}]}}]}\n\n' +
      'data: {"candidates":[{"content":{"parts":[{"text":"하세요"}]}}]}\n\n' +
      'data: [DONE]\n\n'
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      body: makeStream([sse]),
    } as any)))
    const { streamLLMText, collectStreamText } = await import('../../src/server/llm')
    const stream = await streamLLMText({ prompt: 'Hello' })
    const text = await collectStreamText(stream)
    expect(text).toBe('안녕하세요')
  })

  it('streams text split across multiple network chunks', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'AIzaSy-real-key')
    const sse =
      'data: {"candidates":[{"content":{"parts":[{"text":"안녕"}]}}]}\n\n' +
      'data: {"candidates":[{"content":{"parts":[{"text":"하세요"}]}}]}\n\n'
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      body: makeStream([sse.slice(0, 40), sse.slice(40)]),
    } as any)))
    const { streamLLMText, collectStreamText } = await import('../../src/server/llm')
    const stream = await streamLLMText({ prompt: 'Hello' })
    const text = await collectStreamText(stream)
    expect(text).toBe('안녕하세요')
  })

  it('throws on non-ok stream response', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'AIzaSy-real-key')
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 502,
      text: async () => 'bad gateway',
    } as any)))
    const { streamLLMText } = await import('../../src/server/llm')
    await expect(streamLLMText({ prompt: 'Hello' })).rejects.toThrow('Gemini stream error 502')
  })
})
