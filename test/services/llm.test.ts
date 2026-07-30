import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@ai-sdk/openai', () => ({ createOpenAI: vi.fn() }))
vi.mock('@ai-sdk/anthropic', () => ({ createAnthropic: vi.fn() }))
vi.mock('@ai-sdk/google', () => ({ createGoogleGenerativeAI: vi.fn() }))
vi.mock('ai', () => ({ generateText: vi.fn(), streamText: vi.fn() }))

import { isDemoMode } from '../../server/services/llm'

beforeEach(() => {
  delete process.env.OPENAI_API_KEY
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
})

afterEach(() => {
  delete process.env.OPENAI_API_KEY
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
})

describe('isDemoMode', () => {
  it('returns true when all keys are empty via runtimeConfig', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      openaiApiKey: '',
      anthropicApiKey: '',
      googleApiKey: '',
    }))
    expect(isDemoMode()).toBe(true)
    vi.unstubAllGlobals()
  })

  it('returns true when keys contain placeholder values', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      openaiApiKey: 'sk-proj-your-openai-key',
      anthropicApiKey: 'sk-ant-your-anthropic-key',
      googleApiKey: 'AIzaSy-your-google-key',
    }))
    expect(isDemoMode()).toBe(true)
    vi.unstubAllGlobals()
  })

  it('returns true when env vars contain placeholder patterns', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      openaiApiKey: '',
      anthropicApiKey: '',
      googleApiKey: '',
    }))
    process.env.OPENAI_API_KEY = 'sk-proj-your-key'
    process.env.ANTHROPIC_API_KEY = 'sk-ant-your-key'
    expect(isDemoMode()).toBe(true)
    vi.unstubAllGlobals()
  })

  it('returns false when valid keys are present', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      openaiApiKey: 'sk-proj-realkey123456',
      anthropicApiKey: '',
      googleApiKey: '',
    }))
    expect(isDemoMode()).toBe(false)
    vi.unstubAllGlobals()
  })
})
