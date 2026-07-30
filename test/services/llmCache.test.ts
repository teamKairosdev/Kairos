import { describe, it, expect, vi, beforeEach } from 'vitest'

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  keys: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(function () { return redisMock }),
}))

let getCachedResponse: any
let setCachedResponse: any
let invalidateCache: any

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  const mod = await import('../../server/services/llmCache')
  getCachedResponse = mod.getCachedResponse
  setCachedResponse = mod.setCachedResponse
  invalidateCache = mod.invalidateCache
})

describe('getCachedResponse', () => {
  it('returns null when Redis is not configured', async () => {
    const result = await getCachedResponse('hello', 'gpt-4')
    expect(result).toBeNull()
  })

  it('returns cached value when Redis is available', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'http://localhost'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    redisMock.get.mockResolvedValue('cached reply')

    const result = await getCachedResponse('hello', 'gpt-4')
    expect(result).toBe('cached reply')
    expect(redisMock.get).toHaveBeenCalled()
  })
})

describe('setCachedResponse', () => {
  it('silently does nothing when Redis not configured', async () => {
    await setCachedResponse('hello', 'gpt-4', 'reply')
    expect(redisMock.set).not.toHaveBeenCalled()
  })

  it('stores with correct key prefix', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'http://localhost'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'

    await setCachedResponse('hello', 'gpt-4', 'reply', 3600)
    expect(redisMock.set).toHaveBeenCalledOnce()
    const [key, value, opts] = redisMock.set.mock.calls[0]
    expect(key).toMatch(/^llm:cache:/)
    expect(value).toBe('reply')
    expect(opts).toEqual({ ex: 3600 })
  })
})

describe('invalidateCache', () => {
  it('safely does nothing when Redis not configured', async () => {
    await invalidateCache('test')
    expect(redisMock.keys).not.toHaveBeenCalled()
  })

  it('scans and deletes matching keys', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'http://localhost'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    redisMock.keys.mockResolvedValue(['llm:cache:abc', 'llm:cache:def'])

    await invalidateCache('test')
    expect(redisMock.keys).toHaveBeenCalledWith('llm:cache:*test*')
    expect(redisMock.del).toHaveBeenCalledWith('llm:cache:abc', 'llm:cache:def')
  })
})
