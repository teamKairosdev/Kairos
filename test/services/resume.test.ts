import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/server/llm', () => ({
  callLLMStructured: vi.fn(),
}))

vi.mock('../../src/server/guardrail', () => ({
  checkInputGuardrail: vi.fn(() => ({ passed: true, reason: '', layer: 1 })),
  checkOutputAsyncGuardrail: vi.fn(() => ({ passed: true, layer: 2 })),
}))

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual as any, eq: vi.fn() }
})

vi.mock('../../db/index', () => ({ getDb: vi.fn(() => null) }))

import { evaluateResumeDraft, generateImprovedResume } from '../../src/server/resume'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('evaluateResumeDraft', () => {
  it('calls callLLMStructured with correct schema', async () => {
    const mockResult = { score: 85, clarityScore: 80, impactScore: 78, strengths: [], weaknesses: [], suggestions: [] }
    const { callLLMStructured } = await import('../../src/server/llm')
    vi.mocked(callLLMStructured).mockResolvedValueOnce(mockResult)

    const result = await evaluateResumeDraft('any resume content')
    expect(callLLMStructured).toHaveBeenCalledOnce()
    expect(result.score).toBe(85)
  })

  it('throws on guardrail violation', async () => {
    const { checkInputGuardrail } = await import('../../src/server/guardrail')
    vi.mocked(checkInputGuardrail).mockReturnValueOnce({ passed: false, reason: 'blocked content', layer: 1 })
    await expect(evaluateResumeDraft('bad content')).rejects.toThrow('Guardrail Violation')
  })
})

describe('generateImprovedResume', () => {
  it('calls callLLMStructured with evaluation context', async () => {
    const mockResult = { improvedContent: 'improved', keyChanges: ['change1'], estimatedNewScore: 90 }
    const { callLLMStructured } = await import('../../src/server/llm')
    vi.mocked(callLLMStructured).mockResolvedValueOnce(mockResult)

    const evalInput = { score: 68, clarityScore: 72, impactScore: 61, strengths: [], weaknesses: [], suggestions: [] }
    const result = await generateImprovedResume('content', evalInput)
    expect(callLLMStructured).toHaveBeenCalledOnce()
    expect(result.estimatedNewScore).toBe(90)
  })
})
