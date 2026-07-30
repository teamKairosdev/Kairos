import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../server/services/llm', () => ({
  isDemoMode: vi.fn(() => true),
  callLLMStructured: vi.fn(),
}))

import { analyzeATSCompatibility } from '../../server/services/ats'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('analyzeATSCompatibility', () => {
  it('returns demo ATS result in demo mode', async () => {
    const result = await analyzeATSCompatibility('my resume', 'job description')
    expect(result).toHaveProperty('matchScore')
    expect(result).toHaveProperty('foundKeywords')
    expect(result).toHaveProperty('missingKeywords')
    expect(result).toHaveProperty('recommendations')
    expect(result).toHaveProperty('detailedBreakdown')
    expect(result.matchScore).toBe(78)
  })

  it('includes detailed breakdown with all 4 scores', async () => {
    const result = await analyzeATSCompatibility('resume', 'jd')
    expect(result.detailedBreakdown).toHaveProperty('skillsScore')
    expect(result.detailedBreakdown).toHaveProperty('experienceScore')
    expect(result.detailedBreakdown).toHaveProperty('educationScore')
    expect(result.detailedBreakdown).toHaveProperty('keywordDensityScore')
  })

  it('recommendations is a non-empty array', async () => {
    const result = await analyzeATSCompatibility('resume', 'jd')
    expect(result.recommendations.length).toBeGreaterThan(0)
  })

  it('found and missing keywords are arrays', async () => {
    const result = await analyzeATSCompatibility('resume', 'jd')
    expect(Array.isArray(result.foundKeywords)).toBe(true)
    expect(Array.isArray(result.missingKeywords)).toBe(true)
  })
})
