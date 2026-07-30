import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../server/services/llm', () => ({
  isDemoMode: vi.fn(() => false),
  callLLMStructured: vi.fn(),
  streamLLMText: vi.fn(),
}))

import { createInitialInterviewQuestion, evaluateCandidateAnswer, streamInterviewerResponse } from '../../server/services/interview'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createInitialInterviewQuestion', () => {
  it('calls callLLMStructured with job title context', async () => {
    const { callLLMStructured } = await import('../../server/services/llm')
    vi.mocked(callLLMStructured).mockResolvedValueOnce({
      question: 'Tell me about yourself',
      questionType: 'introductory',
      intent: 'assess communication',
    })

    const result = await createInitialInterviewQuestion('Frontend Developer', 'Kakao', 'senior')
    expect(callLLMStructured).toHaveBeenCalledOnce()
    expect(result.question).toBe('Tell me about yourself')
  })
})

describe('evaluateCandidateAnswer', () => {
  it('calls callLLMStructured with conversation history', async () => {
    const { callLLMStructured } = await import('../../server/services/llm')
    vi.mocked(callLLMStructured).mockResolvedValueOnce({
      score: 85, summary: 'good', tip: 'add numbers', nextQuestion: 'next?', nextQuestionType: 'followup',
    })

    const history = [{ sender: 'interviewer', message: 'Hello' }, { sender: 'candidate', message: 'I have experience.' }]
    const result = await evaluateCandidateAnswer('Engineer', history)
    expect(callLLMStructured).toHaveBeenCalledOnce()
    expect(result.score).toBe(85)
  })
})

describe('streamInterviewerResponse', () => {
  it('calls streamLLMText with formatted history', async () => {
    const { streamLLMText } = await import('../../server/services/llm')
    const history = [{ sender: 'interviewer', message: 'Welcome' }, { sender: 'candidate', message: 'Thank you' }]
    await streamInterviewerResponse('Engineer', history)
    expect(streamLLMText).toHaveBeenCalledOnce()
    expect(streamLLMText).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.7, prompt: expect.stringContaining('Engineer') })
    )
  })
})
