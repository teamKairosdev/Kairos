import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../server/services/llm', () => ({
  isDemoMode: vi.fn(() => true),
  callLLMStructured: vi.fn(),
  streamLLMText: vi.fn(),
}))

import { createInitialInterviewQuestion, evaluateCandidateAnswer, streamInterviewerResponse } from '../../server/services/interview'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createInitialInterviewQuestion', () => {
  it('returns demo question in demo mode', async () => {
    const result = await createInitialInterviewQuestion('Frontend Developer', 'Kakao', 'senior')
    expect(result).toHaveProperty('question')
    expect(result).toHaveProperty('questionType')
    expect(result).toHaveProperty('intent')
    expect(result.questionType).toBe('introductory')
    expect(result.question).toContain('Frontend Developer')
  })
})

describe('evaluateCandidateAnswer', () => {
  it('returns demo feedback in demo mode', async () => {
    const history = [
      { sender: 'interviewer', message: 'Hello' },
      { sender: 'candidate', message: 'I have 5 years of experience.' },
    ]
    const result = await evaluateCandidateAnswer('Frontend Developer', history)
    expect(result).toHaveProperty('score')
    expect(result).toHaveProperty('summary')
    expect(result).toHaveProperty('tip')
    expect(result).toHaveProperty('nextQuestion')
    expect(result).toHaveProperty('nextQuestionType')
    expect(result.score).toBe(78)
  })
})

describe('streamInterviewerResponse', () => {
  it('calls streamLLMText with formatted history', async () => {
    const { streamLLMText } = await import('../../server/services/llm')
    const history = [
      { sender: 'interviewer', message: 'Welcome' },
      { sender: 'candidate', message: 'Thank you' },
    ]
    await streamInterviewerResponse('Engineer', history)
    expect(streamLLMText).toHaveBeenCalledOnce()
    expect(streamLLMText).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.7,
        prompt: expect.stringContaining('Engineer'),
      })
    )
  })
})
