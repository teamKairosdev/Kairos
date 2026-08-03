import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const routeMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getSession: vi.fn(),
  streamLLMText: vi.fn(),
}));

vi.mock('@/db', () => ({ getDb: routeMocks.getDb }));
vi.mock('@/server/getSession', () => ({ getSession: routeMocks.getSession }));
vi.mock('@/server/llm', () => ({ streamLLMText: routeMocks.streamLLMText }));
vi.mock('@/server/context', () => ({
  buildContextWindow: vi.fn((messages: Array<{ content: string }>) => messages.map((message) => message.content).join('\n')),
}));

function createStorage(initial: Record<string, unknown> = {}): Storage {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
  };
}

function installMockBrowser(initial: Record<string, unknown>) {
  const storage = createStorage(initial);
  storage.setItem('is_mock_mode', 'true');
  const originalFetch = vi.fn(async () => new Response(null, { status: 500 }));
  vi.stubGlobal('window', {
    fetch: originalFetch,
    location: { origin: 'http://localhost' },
  });
  vi.stubGlobal('localStorage', storage);
  return { storage, originalFetch };
}

function selectBuilder(result: unknown) {
  const builder = {
    from: vi.fn(() => builder),
    where: vi.fn(() => Promise.resolve(result)),
    orderBy: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  builder.where = vi.fn(() => builder);
  return builder;
}

function updateBuilder(result: unknown) {
  const builder = {
    set: vi.fn(() => builder),
    where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve(result)) })),
  };
  return builder;
}

function insertBuilder() {
  return { values: vi.fn(() => Promise.resolve()) };
}

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

const inProgressInterview = {
  id: 'interview-1',
  userId: 'user-1',
  jobTitle: 'Software Engineer',
  companyName: 'Kairos',
  difficulty: 'medium',
  status: 'in_progress',
  overallScore: null,
  overallFeedback: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('interview mock interceptor', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('extracts resume refine and interview chat IDs from the pathname', async () => {
    const { storage } = installMockBrowser({
      mock_resumes: [{
        id: 'resume-1',
        userId: 'user-1',
        title: 'Resume',
        originalContent: 'content',
        status: 'draft',
        currentScore: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
      }],
      mock_interviews: [{ ...inProgressInterview, createdAt: inProgressInterview.createdAt.toISOString(), updatedAt: inProgressInterview.updatedAt.toISOString() }],
      mock_chats: {},
    });
    const { initMockInterceptor } = await import('../../src/lib/mockInterceptor');
    initMockInterceptor();

    const browser = globalThis.window as Window;
    const refineResponse = await browser.fetch('http://localhost/api/resumes/resume-1/refine?step=improve', { method: 'POST' });
    expect((await refineResponse.json()).id).toBe('resume-1');

    const chatResponse = await browser.fetch('/api/interviews/interview-1/chat?turn=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'My answer' }] }),
    });
    expect(chatResponse.status).toBe(200);
    expect(chatResponse.headers.get('content-type')).toContain('text/plain');
    expect(await chatResponse.text()).toContain('구현 경험');

    const chats = JSON.parse(storage.getItem('mock_chats') || '{}');
    expect(chats['interview-1'][0]).toEqual({ role: 'user', content: 'My answer' });
  });

  it('matches the API shape and rejects chat after completion', async () => {
    const completed = { ...inProgressInterview, status: 'completed' };
    const { storage } = installMockBrowser({
      mock_interviews: [{ ...completed, createdAt: completed.createdAt.toISOString(), updatedAt: completed.updatedAt.toISOString() }],
      mock_chats: { 'interview-1': [{ role: 'assistant', content: 'Question' }] },
    });
    const { initMockInterceptor } = await import('../../src/lib/mockInterceptor');
    initMockInterceptor();
    const browser = globalThis.window as Window;

    const detailResponse = await browser.fetch('/api/interviews/interview-1');
    expect(await detailResponse.json()).toMatchObject({
      id: 'interview-1',
      status: 'completed',
      messages: [{ role: 'assistant', content: 'Question' }],
    });

    const chatResponse = await browser.fetch('/api/interviews/interview-1/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Too late' }] }),
    });
    expect(chatResponse.status).toBe(409);
    expect(await chatResponse.json()).toEqual({ error: '면접이 이미 종료되었습니다.' });

    const patchResponse = await browser.fetch('/api/interviews/interview-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    });
    expect(patchResponse.status).toBe(409);
    expect(JSON.parse(storage.getItem('mock_interviews') || '[]')[0].status).toBe('completed');
  });
});

describe('interview API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.getSession.mockResolvedValue({ userId: 'user-1' });
  });

  it('returns the same flat session plus role/content messages as mock GET', async () => {
    const messages = [
      { sender: 'interviewer', message: 'Question' },
      { sender: 'candidate', message: 'Answer' },
    ];
    routeMocks.getDb.mockReturnValue({
      select: vi.fn()
        .mockImplementationOnce(() => selectBuilder([inProgressInterview]))
        .mockImplementationOnce(() => selectBuilder(messages)),
    });
    const { GET } = await import('../../src/app/api/interviews/[id]/route');

    const response = await GET(
      new NextRequest('http://localhost/api/interviews/interview-1'),
      { params: Promise.resolve({ id: 'interview-1' }) },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      id: 'interview-1',
      status: 'in_progress',
      messages: [
        { role: 'assistant', content: 'Question' },
        { role: 'user', content: 'Answer' },
      ],
    });
  }, 10000);

  it('returns the created session after saving its initial interviewer message', async () => {
    const createdSession = { ...inProgressInterview };
    const sessionValues = vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([createdSession])),
    }));
    const messageValues = vi.fn(() => Promise.resolve());
    const insert = vi.fn()
      .mockImplementationOnce(() => ({ values: sessionValues }))
      .mockImplementationOnce(() => ({ values: messageValues }));
    routeMocks.getDb.mockReturnValue({ insert });
    const { POST } = await import('../../src/app/api/interviews/route');

    const response = await POST(
      new NextRequest('http://localhost/api/interviews', {
        method: 'POST',
        body: JSON.stringify({ jobTitle: 'Software Engineer', companyName: 'Kairos', difficulty: 'medium' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      session: {
        ...createdSession,
        createdAt: createdSession.createdAt.toISOString(),
        updatedAt: createdSession.updatedAt.toISOString(),
      },
    });
    expect(messageValues).toHaveBeenCalledWith({
      interviewId: createdSession.id,
      sender: 'interviewer',
      message: '안녕하세요. Kairos의 Software Engineer 직무 면접에 지원해주셔서 감사합니다. 먼저 준비하신 자기소개 부탁드립니다.',
    });
  });

  it('deletes the session when saving the initial interviewer message fails', async () => {
    const createdSession = { ...inProgressInterview };
    const messageError = new Error('initial message insert failed');
    const sessionValues = vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([createdSession])),
    }));
    const messageValues = vi.fn(() => Promise.reject(messageError));
    const cleanupWhere = vi.fn(() => Promise.resolve());
    const deleteInterview = vi.fn(() => ({ where: cleanupWhere }));
    const insert = vi.fn()
      .mockImplementationOnce(() => ({ values: sessionValues }))
      .mockImplementationOnce(() => ({ values: messageValues }));
    routeMocks.getDb.mockReturnValue({ insert, delete: deleteInterview });
    const { POST } = await import('../../src/app/api/interviews/route');

    const responsePromise = POST(
      new NextRequest('http://localhost/api/interviews', {
        method: 'POST',
        body: JSON.stringify({ jobTitle: 'Software Engineer', companyName: 'Kairos' }),
      }),
    );

    await expect(responsePromise).rejects.toBe(messageError);
    expect(deleteInterview).toHaveBeenCalledTimes(1);
    expect(cleanupWhere).toHaveBeenCalledTimes(1);
  });

  it('allows only an in-progress to completed transition', async () => {
    const update = updateBuilder([{ id: 'interview-1' }]);
    routeMocks.getDb.mockReturnValue({
      select: vi.fn(() => selectBuilder([inProgressInterview])),
      update: vi.fn(() => update),
    });
    const { PATCH } = await import('../../src/app/api/interviews/[id]/route');

    const response = await PATCH(
      new NextRequest('http://localhost/api/interviews/interview-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      }),
      { params: Promise.resolve({ id: 'interview-1' }) },
    );
    expect(response.status).toBe(200);
    expect(update.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
  });

  it('returns 409 when completing an already completed session', async () => {
    const update = updateBuilder([{ id: 'interview-1' }]);
    routeMocks.getDb.mockReturnValue({
      select: vi.fn(() => selectBuilder([{ ...inProgressInterview, status: 'completed' }])),
      update: vi.fn(() => update),
    });
    const { PATCH } = await import('../../src/app/api/interviews/[id]/route');

    const response = await PATCH(
      new NextRequest('http://localhost/api/interviews/interview-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      }),
      { params: Promise.resolve({ id: 'interview-1' }) },
    );
    expect(response.status).toBe(409);
    expect(update.set).not.toHaveBeenCalled();
  });

  it('rejects chat before starting an LLM stream for a completed session', async () => {
    routeMocks.getDb.mockReturnValue({
      select: vi.fn(() => selectBuilder([{ ...inProgressInterview, status: 'completed' }])),
      insert: vi.fn(insertBuilder),
    });
    const { POST } = await import('../../src/app/api/interviews/[id]/chat/route');

    const response = await POST(
      new NextRequest('http://localhost/api/interviews/interview-1/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Too late' }] }),
      }),
      { params: Promise.resolve({ id: 'interview-1' }) },
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: '면접이 이미 종료되었습니다.' });
    expect(routeMocks.streamLLMText).not.toHaveBeenCalled();
  });

  it('keeps the chat response as a plain text stream and persists messages', async () => {
    const insert = vi.fn(insertBuilder);
    routeMocks.getDb.mockReturnValue({
      select: vi.fn(() => selectBuilder([inProgressInterview])),
      insert,
    });
    routeMocks.streamLLMText.mockResolvedValue(makeStream(['Hello', ' world']));
    const { POST } = await import('../../src/app/api/interviews/[id]/chat/route');

    const response = await POST(
      new NextRequest('http://localhost/api/interviews/interview-1/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Answer' }] }),
      }),
      { params: Promise.resolve({ id: 'interview-1' }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(await response.text()).toBe('Hello world');
    expect(insert).toHaveBeenCalledTimes(2);
  });
});
