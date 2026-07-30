import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockModel = { modelId: 'gemini-mock' }

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn(() => mockModel)),
}))
vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => vi.fn(() => mockModel)),
}))
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => vi.fn(() => mockModel)),
}))
vi.mock('ai', () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
  Output: { object: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('getPreferredLanguageModel', () => {
  it('returns Google model when Google API key is set', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ googleApiKey: 'AIzaSy-real-key', anthropicApiKey: '', openaiApiKey: '', vercelAiGatewayUrl: '' }))
    const { getPreferredLanguageModel } = await import('../../server/services/llm')
    const model = getPreferredLanguageModel()
    expect(model).toEqual(mockModel)
  })

  it('throws when no API key is configured', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ googleApiKey: '', anthropicApiKey: '', openaiApiKey: '', vercelAiGatewayUrl: '' }))
    const { getPreferredLanguageModel } = await import('../../server/services/llm')
    expect(() => getPreferredLanguageModel()).toThrow('No valid API key configured')
  })

  it('rejects placeholder keys', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ googleApiKey: 'AIzaSy-your-google-key', anthropicApiKey: '', openaiApiKey: '', vercelAiGatewayUrl: '' }))
    const { getPreferredLanguageModel } = await import('../../server/services/llm')
    expect(() => getPreferredLanguageModel()).toThrow('No valid API key configured')
  })

  it('passes gateway baseURL when VERCEL_AI_GATEWAY_URL is set', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ googleApiKey: 'AIzaSy-real-key', anthropicApiKey: '', openaiApiKey: '', vercelAiGatewayUrl: 'https://gateway.example.com' }))
    const googleModule = await import('@ai-sdk/google')
    const { getPreferredLanguageModel } = await import('../../server/services/llm')
    getPreferredLanguageModel()
    expect(vi.mocked(googleModule.createGoogleGenerativeAI)).toHaveBeenCalledWith({
      apiKey: 'AIzaSy-real-key',
      baseURL: 'https://gateway.example.com/google',
    })
  })
})

describe('callLLMText', () => {
  it('calls generateText with instructions and prompt', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ googleApiKey: 'AIzaSy-real-key', anthropicApiKey: '', openaiApiKey: '', vercelAiGatewayUrl: '' }))
    const ai = await import('ai')
    vi.mocked(ai.generateText).mockResolvedValue({ text: 'response text' } as never)
    const { callLLMText } = await import('../../server/services/llm')
    const result = await callLLMText({ instructions: 'Be helpful', prompt: 'Hello' })
    expect(result).toBe('response text')
  })
})

describe('callLLMStructured', () => {
  it('calls generateText with Output.object schema', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ googleApiKey: 'AIzaSy-real-key', anthropicApiKey: '', openaiApiKey: '', vercelAiGatewayUrl: '' }))
    const ai = await import('ai')
    vi.mocked(ai.Output.object).mockReturnValue('schema-config' as never)
    vi.mocked(ai.generateText).mockResolvedValue({ output: { score: 85 } } as never)
    const { callLLMStructured } = await import('../../server/services/llm')
    const result = await callLLMStructured({ instructions: 'Rate', prompt: 'Item', schema: { score: 'number' } })
    expect(result).toEqual({ score: 85 })
  })
})
