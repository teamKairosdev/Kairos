import { vi } from 'vitest'


vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
  },
}))

vi.stubGlobal('useRuntimeConfig', () => ({
  openaiApiKey: '',
  anthropicApiKey: '',
  googleApiKey: '',
  upstashRedisRestUrl: '',
  upstashRedisRestToken: '',
}))
