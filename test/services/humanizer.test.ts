import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../server/services/llm', () => ({
  isDemoMode: vi.fn(() => false),
  callLLMStructured: vi.fn(),
}))

import { processAIHumanizer } from '../../server/services/humanizer'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('processAIHumanizer', () => {
  it('calls callLLMStructured and returns humanized result', async () => {
    const { callLLMStructured } = await import('../../server/services/llm')
    vi.mocked(callLLMStructured).mockResolvedValueOnce({
      humanizedText: 'natural text',
      styleScore: 90,
      changesSummary: 'removed passive voice',
      removedClichés: ['in terms of'],
    })

    const result = await processAIHumanizer('some text')
    expect(callLLMStructured).toHaveBeenCalledOnce()
    expect(result).toHaveProperty('humanizedText')
    expect(result).toHaveProperty('styleScore')
    expect(result).toHaveProperty('changesSummary')
    expect(result).toHaveProperty('removedClichés')
  })
})
