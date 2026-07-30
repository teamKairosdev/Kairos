import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../server/services/llm', () => ({
  isDemoMode: vi.fn(() => true),
  callLLMStructured: vi.fn(),
}))

vi.mock('../../server/services/guardrail', () => ({
  checkInputGuardrail: vi.fn(() => ({ passed: true, reason: '' })),
  checkOutputAsyncGuardrail: vi.fn(() => ({ passed: true })),
}))

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual as any, eq: vi.fn() }
})

vi.mock('../../db/index', () => ({ getDb: vi.fn(() => null) }))

import { evaluateResumeDraft, generateImprovedResume, executeResumeRefinementChain } from '../../server/services/resume'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('evaluateResumeDraft', () => {
  it('returns demo evaluation in demo mode', async () => {
    const result = await evaluateResumeDraft('any resume content')
    expect(result).toHaveProperty('score')
    expect(result).toHaveProperty('strengths')
    expect(result).toHaveProperty('weaknesses')
    expect(result).toHaveProperty('suggestions')
    expect(result.score).toBe(68)
  })

  it('throws on guardrail violation', async () => {
    const { checkInputGuardrail } = await import('../../server/services/guardrail')
    vi.mocked(checkInputGuardrail).mockReturnValueOnce({ passed: false, reason: 'blocked content' })
    await expect(evaluateResumeDraft('bad content')).rejects.toThrow('Guardrail Violation')
  })
})

describe('generateImprovedResume', () => {
  it('returns demo improved resume in demo mode', async () => {
    const evalInput = { score: 68, clarityScore: 72, impactScore: 61, strengths: [], weaknesses: [], suggestions: [] }
    const result = await generateImprovedResume('content', evalInput)
    expect(result).toHaveProperty('improvedContent')
    expect(result).toHaveProperty('keyChanges')
    expect(result).toHaveProperty('estimatedNewScore')
    expect(result.estimatedNewScore).toBe(94)
  })
})

describe('executeResumeRefinementChain', () => {
  it('returns demo refinement result in demo mode without DB', async () => {
    const result = await executeResumeRefinementChain('demo-id')
    expect(result).toHaveProperty('evaluation')
    expect(result).toHaveProperty('improvedResult')
    expect(result.evaluation.score).toBe(68)
    expect(result.improvedResult.estimatedNewScore).toBe(94)
  })
})
