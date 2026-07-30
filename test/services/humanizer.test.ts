import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../server/services/llm', () => ({
  isDemoMode: vi.fn(() => true),
  callLLMStructured: vi.fn(),
}))

import { processAIHumanizer } from '../../server/services/humanizer'
import { isDemoMode } from '../../server/services/llm'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('processAIHumanizer', () => {
  it('returns demo result in demo mode', async () => {
    const result = await processAIHumanizer('some text')
    expect(result).toHaveProperty('humanizedText')
    expect(result).toHaveProperty('styleScore')
    expect(result).toHaveProperty('changesSummary')
    expect(result).toHaveProperty('removedClichés')
    expect(isDemoMode).toHaveBeenCalledOnce()
  })

  it('styleScore is between 0 and 100', async () => {
    const result = await processAIHumanizer('text')
    expect(result.styleScore).toBeGreaterThanOrEqual(0)
    expect(result.styleScore).toBeLessThanOrEqual(100)
  })

  it('removedClichés is an array', async () => {
    const result = await processAIHumanizer('text')
    expect(Array.isArray(result.removedClichés)).toBe(true)
  })

  it('humanizedText is a non-empty string', async () => {
    const result = await processAIHumanizer('text')
    expect(result.humanizedText).toBeTruthy()
    expect(typeof result.humanizedText).toBe('string')
  })
})
