import { describe, it, expect, vi, beforeEach } from 'vitest'

let getCachedResponse: any
let setCachedResponse: any
let invalidateCache: any
let resetRedis: any

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  const mod = await import('../../server/services/llmCache')
  getCachedResponse = mod.getCachedResponse
  setCachedResponse = mod.setCachedResponse
  invalidateCache = mod.invalidateCache
  resetRedis = mod.resetRedis
  resetRedis()
})

describe('getCachedResponse', () => {
  it('returns null when no cached value exists', async () => {
    const result = await getCachedResponse('hello', 'gpt-4')
    expect(result).toBeNull()
  })

  it('returns cached value when available', async () => {
    await setCachedResponse('hello', 'gpt-4', 'cached reply')
    const result = await getCachedResponse('hello', 'gpt-4')
    expect(result).toBe('cached reply')
  })
})

describe('setCachedResponse', () => {
  it('stores a value that can be retrieved', async () => {
    await setCachedResponse('hello', 'gpt-4', 'reply', 3600)
    const result = await getCachedResponse('hello', 'gpt-4')
    expect(result).toBe('reply')
  })
})

describe('invalidateCache', () => {
  it('clears matching entries', async () => {
    await setCachedResponse('hello world', 'gpt-4', 'reply')
    await setCachedResponse('goodbye world', 'gpt-4', 'reply2')
    await invalidateCache('hello')
    const result = await getCachedResponse('hello world', 'gpt-4')
    expect(result).toBeNull()
    const result2 = await getCachedResponse('goodbye world', 'gpt-4')
    expect(result2).toBe('reply2')
  })
})
