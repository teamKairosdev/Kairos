import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getSession: vi.fn(),
  streamLLMText: vi.fn(),
}));

vi.mock('@/db', () => ({ getDb: mocks.getDb }));
vi.mock('@/server/getSession', () => ({ getSession: mocks.getSession }));
vi.mock('@/server/llm', () => ({
  streamLLMText: mocks.streamLLMText,
}));
vi.mock('@/db/schema', () => ({ resumes: { id: {}, userId: {} } }));
vi.mock('drizzle-orm', () => ({ and: vi.fn(), eq: vi.fn() }));

import { POST as postResumeChat } from '../../src/app/api/resumes/[id]/chat/route';

function request(path: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(`http://localhost${path}`, init);
}

describe('resume chat streaming API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ userId: 'user-a' });
    mocks.getDb.mockReturnValue({
      select: vi.fn(() => ({
        from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ id: 'resume-a' }]) })),
      })),
    });
  });

  it('emits incremental text and a final suggestion event', async () => {
    const encoder = new TextEncoder();
    const responseStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('첫 번째 '));
        controller.enqueue(encoder.encode('응답입니다.'));
        controller.close();
      },
    });
    const suggestionStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('개선된 '));
        controller.enqueue(encoder.encode('이력서 문장'));
        controller.close();
      },
    });
    mocks.streamLLMText.mockResolvedValueOnce(responseStream).mockResolvedValueOnce(suggestionStream);

    const response = await postResumeChat(
      request('/api/resumes/resume-a/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: '성과를 구체화해줘', currentContent: '기존 이력서' }),
      }),
      { params: Promise.resolve({ id: 'resume-a' }) },
    );

    const events = (await response.text()).trim().split('\n').map((line) => JSON.parse(line) as { type: string; value?: string });
    expect(response.headers.get('content-type')).toContain('application/x-ndjson');
    expect(events.map((event) => event.type)).toEqual(['start', 'text', 'text', 'suggestion_start', 'suggestion_delta', 'suggestion_delta', 'suggestion_done', 'done']);
    expect(events.filter((event) => event.type === 'text').map((event) => event.value).join('')).toBe('첫 번째 응답입니다.');
    expect(events.filter((event) => event.type === 'suggestion_delta').map((event) => event.value).join('')).toBe('개선된 이력서 문장');
    expect(mocks.streamLLMText).toHaveBeenCalledTimes(2);
  });

  it('rejects unauthenticated requests before starting a model stream', async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await postResumeChat(
      request('/api/resumes/resume-a/chat', { method: 'POST', body: '{}' }),
      { params: Promise.resolve({ id: 'resume-a' }) },
    );

    expect(response.status).toBe(401);
    expect(mocks.streamLLMText).not.toHaveBeenCalled();
  });
});
