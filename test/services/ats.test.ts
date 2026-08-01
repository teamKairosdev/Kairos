import { describe, it, expect } from 'vitest'
import { analyzeATSCompatibility } from '../../src/server/ats'

describe('analyzeATSCompatibility', () => {
  it('returns complete analysis structure', () => {
    const result = analyzeATSCompatibility('', '')
    expect(result).toHaveProperty('matchScore')
    expect(result).toHaveProperty('foundKeywords')
    expect(result).toHaveProperty('missingKeywords')
    expect(result).toHaveProperty('recommendations')
    expect(result).toHaveProperty('detailedBreakdown')
    expect(result.detailedBreakdown).toHaveProperty('skillsScore')
    expect(result.detailedBreakdown).toHaveProperty('experienceScore')
    expect(result.detailedBreakdown).toHaveProperty('educationScore')
    expect(result.detailedBreakdown).toHaveProperty('keywordDensityScore')
  })

  it('detects matching skills from resume', () => {
    const resume = 'I have 3 years experience with React, TypeScript, and Node.js'
    const jd = 'We need React, TypeScript, Node.js, and Docker'
    const result = analyzeATSCompatibility(resume, jd)
    expect(result.foundKeywords).toContain('react')
    expect(result.foundKeywords).toContain('typescript')
    expect(result.foundKeywords).toContain('node.js')
    expect(result.missingKeywords).toContain('docker')
  })

  it('returns recommendations for missing keywords', () => {
    const resume = 'I know Python'
    const jd = 'We need React, Docker, and AWS'
    const result = analyzeATSCompatibility(resume, jd)
    expect(result.missingKeywords.length).toBeGreaterThan(0)
    expect(result.recommendations.length).toBeGreaterThan(0)
    expect(result.matchScore).toBeLessThan(50)
  })

  it('handles empty resume and job description', () => {
    const result = analyzeATSCompatibility('', '')
    expect(result.matchScore).toBeGreaterThanOrEqual(0)
    expect(result.foundKeywords).toEqual([])
    expect(result.missingKeywords).toEqual([])
  })

  it('detects Korean tech keywords', () => {
    const resume = '3년차 React, TypeScript 개발자입니다.'
    const jd = 'React, TypeScript, Node.js 경험자 우대'
    const result = analyzeATSCompatibility(resume, jd)
    expect(result.foundKeywords).toContain('react')
    expect(result.foundKeywords).toContain('typescript')
  })

  it('calculates experience score proportionally', () => {
    const resume = '5 years of experience as a software engineer'
    const jd = '7+ years of experience required'
    const result = analyzeATSCompatibility(resume, jd)
    expect(result.detailedBreakdown.experienceScore).toBeGreaterThan(0)
    expect(result.detailedBreakdown.experienceScore).toBeLessThanOrEqual(100)
  })

  it('handles category-weighted scoring', () => {
    const resume = 'React, TypeScript, CSS, Python, Django, PostgreSQL, Docker, AWS'
    const jd = 'React, TypeScript, Node.js, PostgreSQL, Docker, AWS'
    const result = analyzeATSCompatibility(resume, jd)
    expect(result.detailedBreakdown.skillsScore).toBeGreaterThan(50)
    expect(result.foundKeywords.length).toBeGreaterThanOrEqual(5)
  })

  it('normalizes skill synonyms', () => {
    const resume = 'I use Vue.js, Nuxt, and TS daily'
    const jd = 'We need Vue, Vue.js, and TypeScript'
    const result = analyzeATSCompatibility(resume, jd)
    expect(result.foundKeywords).toContain('vue')
    expect(result.foundKeywords).toContain('typescript')
  })
})
