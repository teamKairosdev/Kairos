import { vi } from 'vitest'

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
  },
}))
