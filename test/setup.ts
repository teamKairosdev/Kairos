import { vi } from 'vitest'

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    keys: vi.fn(),
    del: vi.fn(),
  })),
}))

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
