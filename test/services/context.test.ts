import { describe, it, expect } from 'vitest'
import { buildContextWindow } from '../../server/services/context'

describe('buildContextWindow', () => {
  it('returns empty string for empty messages', () => {
    expect(buildContextWindow([])).toBe('')
  })

  it('preserves system messages', () => {
    const result = buildContextWindow([
      { role: 'system', content: 'You are a helpful assistant.' },
    ])
    expect(result).toContain('[SYSTEM]')
    expect(result).toContain('helpful assistant')
  })

  it('limits conversation to window size', () => {
    const messages = Array.from({ length: 30 }, (_, i) => ({
      role: 'user' as const,
      content: `Message ${i + 1}`,
    }))
    const result = buildContextWindow(messages, { windowSize: 10 })
    expect(result).not.toContain('Message 1')
    expect(result).toContain('Message 21')
    expect(result).toContain('Message 30')
  })

  it('includes recent messages within window', () => {
    const messages = [
      { role: 'system' as const, content: 'System prompt' },
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there' },
      { role: 'user' as const, content: 'How are you?' },
    ]
    const result = buildContextWindow(messages, { windowSize: 5 })
    expect(result).toContain('System prompt')
    expect(result).toContain('Hello')
    expect(result).toContain('How are you?')
  })

  it('truncates by maxTokens when limit is exceeded', () => {
    const messages = [
      { role: 'system' as const, content: 'Sys' },
      { role: 'user' as const, content: 'A'.repeat(20000) },
      { role: 'user' as const, content: 'B'.repeat(20000) },
    ]
    const result = buildContextWindow(messages, { maxTokens: 500 })
    // Should be significantly shorter than the full input
    expect(result.length).toBeLessThan(12000)
  })

  it('interleaves roles correctly in output', () => {
    const messages = [
      { role: 'system' as const, content: 'System message' },
      { role: 'user' as const, content: 'User message' },
      { role: 'assistant' as const, content: 'Assistant message' },
    ]
    const result = buildContextWindow(messages)
    expect(result).toContain('[SYSTEM]')
    expect(result).toContain('[USER]')
    expect(result).toContain('[ASSISTANT]')
    expect(result.indexOf('[SYSTEM]')).toBeLessThan(result.indexOf('[USER]'))
  })
})
