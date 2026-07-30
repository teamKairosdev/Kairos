import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../server/services/llm', () => ({
  isDemoMode: vi.fn(() => false),
  callLLMStructured: vi.fn(),
}))

import { analyzeATSCompatibility } from '../../server/services/ats'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('analyzeATSCompatibility', () => {
  it('calls callLLMStructured with resume and job description', async () => {
    const { callLLMStructured } = await import('../../server/services/llm')
    const mockResult = {
      matchScore: 85,
      foundKeywords: ['TypeScript', 'React'],
      missingKeywords: ['Docker'],
      recommendations: ['Add Docker experience'],
      detailedBreakdown: { skillsScore: 80, experienceScore: 70, educationScore: 90, keywordDensityScore: 75 },
    }
    vi.mocked(callLLMStructured).mockResolvedValueOnce(mockResult)

    const result = await analyzeATSCompatibility('my resume', 'job description')
    expect(callLLMStructured).toHaveBeenCalledOnce()
    expect(result.matchScore).toBe(85)
    expect(result.foundKeywords).toContain('TypeScript')
  })

  it('returns complete analysis structure', async () => {
    const { callLLMStructured } = await import('../../server/services/llm')
    vi.mocked(callLLMStructured).mockResolvedValueOnce({
      matchScore: 70, foundKeywords: [], missingKeywords: [], recommendations: [],
      detailedBreakdown: { skillsScore: 70, experienceScore: 70, educationScore: 70, keywordDensityScore: 70 },
    })

    const result = await analyzeATSCompatibility('resume', 'jd')
    expect(result).toHaveProperty('matchScore')
    expect(result).toHaveProperty('foundKeywords')
    expect(result).toHaveProperty('missingKeywords')
    expect(result).toHaveProperty('recommendations')
    expect(result).toHaveProperty('detailedBreakdown')
  })
})
