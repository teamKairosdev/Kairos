import { describe, it, expect, vi, beforeEach } from 'vitest'

const mammothMock = vi.hoisted(() => ({
  extractRawText: vi.fn(),
}))

vi.mock('mammoth', () => ({
  default: mammothMock,
}))

import { parseDocumentText } from '../../src/server/parser'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('parseDocumentText', () => {
  it('returns plain text for unknown mime type', async () => {
    const result = await parseDocumentText(Buffer.from('hello world'), 'text/plain', 'test.txt')
    expect(result).toBe('hello world')
  })

  it('trims plain text output', async () => {
    const result = await parseDocumentText(Buffer.from('  hello world  '), 'text/plain', 'test.txt')
    expect(result).toBe('hello world')
  })

  it('parses docx via mammoth', async () => {
    mammothMock.extractRawText.mockResolvedValue({ value: '  extracted docx content  ' })
    const result = await parseDocumentText(Buffer.from('fake-docx'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'test.docx')
    expect(result).toBe('extracted docx content')
    expect(mammothMock.extractRawText).toHaveBeenCalledOnce()
  })

  it('parses docx by file extension', async () => {
    mammothMock.extractRawText.mockResolvedValue({ value: 'content by ext' })
    const result = await parseDocumentText(Buffer.from('fake'), 'application/octet-stream', 'report.docx')
    expect(result).toBe('content by ext')
  })

  it('falls back to ascii extraction on pdf error', async () => {
    const result = await parseDocumentText(Buffer.from('hello world'), 'application/pdf', 'test.pdf')
    expect(result).toBe('hello world')
  })

  it('strips non-printable chars in pdf fallback', async () => {
    const buf = Buffer.from('hello\x00world\x01test')
    const result = await parseDocumentText(buf, 'application/pdf', 'test.pdf')
    expect(result).toBe('hello world test')
  })

  it('truncates pdf fallback to 5000 chars', async () => {
    const long = 'a'.repeat(6000)
    const result = await parseDocumentText(Buffer.from(long), 'application/pdf', 'test.pdf')
    expect(result.length).toBeLessThanOrEqual(5000)
  })
})
