import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/server/llm', () => ({
  callLLMStructured: vi.fn(),
}))

import { processAIHumanizer } from '../../src/server/humanizer'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('processAIHumanizer', () => {
  it('calls callLLMStructured and returns humanized result', async () => {
    const { callLLMStructured } = await import('../../src/server/llm')
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
