import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getDb: vi.fn(),
  streamLLMText: vi.fn(),
  collectStreamText: vi.fn(),
  toGeminiMessages: vi.fn((messages: unknown[] | undefined) => messages || []),
  getCachedResponse: vi.fn(),
  setCachedResponse: vi.fn(),
  analyzeCompanyMetaInfo: vi.fn(),
}));

vi.mock('@/server/getSession', () => ({ getSession: mocks.getSession }));
vi.mock('@/db', () => ({ getDb: mocks.getDb }));
vi.mock('@/server/llm', () => ({
  streamLLMText: mocks.streamLLMText,
  collectStreamText: mocks.collectStreamText,
  toGeminiMessages: mocks.toGeminiMessages,
}));
vi.mock('@/server/llmCache', () => ({
  getCachedResponse: mocks.getCachedResponse,
  setCachedResponse: mocks.setCachedResponse,
}));
vi.mock('@/server/companyMeta', () => ({ analyzeCompanyMetaInfo: mocks.analyzeCompanyMetaInfo }));
vi.mock('@/db/schema', () => ({
  resumes: {},
  resumeRefinements: {},
  mockInterviews: {},
  interviewMessages: {},
}));
vi.mock('drizzle-orm', () => ({ and: vi.fn(), desc: vi.fn(), eq: vi.fn() }));

import { POST as postChat } from '../../src/app/api/llm/chat/route';
import { POST as postRefine } from '../../src/app/api/llm/refine/route';
import { POST as postStream } from '../../src/app/api/llm/stream/route';
import { POST as postCompanyMeta } from '../../src/app/api/company/meta/route';
import { GET as getResumes, POST as postResume } from '../../src/app/api/resumes/route';
import { GET as getInterviews, POST as postInterview } from '../../src/app/api/interviews/route';

function request(path: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(`http://localhost${path}`, init);
}

function insertDatabase(result: unknown) {
  const returning = vi.fn().mockResolvedValue(result);
  const values = vi.fn(() => ({ returning }));
  const insert = vi.fn(() => ({ values }));
  mocks.getDb.mockReturnValue({ insert });
  return { insert, values };
}

describe('API authentication boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(null);
    mocks.getDb.mockReturnValue(null);
  });

  it('rejects unauthenticated calls before any paid provider route runs', async () => {
    const routes = [
      ['llm/chat', () => postChat(request('/api/llm/chat', { method: 'POST' }))],
      ['llm/refine', () => postRefine(request('/api/llm/refine', { method: 'POST' }))],
      ['llm/stream', () => postStream(request('/api/llm/stream', { method: 'POST' }))],
      ['company/meta', () => postCompanyMeta(request('/api/company/meta', { method: 'POST' }))],
      ['resumes', () => getResumes(request('/api/resumes'))],
      ['interviews', () => getInterviews(request('/api/interviews'))],
    ] as const;

    for (const [name, invoke] of routes) {
      const response = await invoke();
      expect(response.status, name).toBe(401);
    }

    expect(mocks.streamLLMText).not.toHaveBeenCalled();
    expect(mocks.getCachedResponse).not.toHaveBeenCalled();
    expect(mocks.analyzeCompanyMetaInfo).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it('does not treat the client demo cookie as server authentication', async () => {
    const response = await postChat(request('/api/llm/chat', {
      method: 'POST',
      headers: { cookie: 'kairos_mock_session=1' },
    }));

    expect(response.status).toBe(401);
    expect(mocks.streamLLMText).not.toHaveBeenCalled();
  });

  it('uses the session user ID instead of a body user ID when creating a resume', async () => {
    mocks.getSession.mockResolvedValue({ userId: 'session-user' });
    const { insert } = insertDatabase([{
      id: 'resume-1',
      userId: 'session-user',
      title: 'Resume',
      originalContent: 'Content',
    }]);

    const response = await postResume(request('/api/resumes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 'attacker-user',
        title: 'Resume',
        originalContent: 'Content',
      }),
    }));

    expect(response.status).toBe(200);
    expect(insert.mock.results[0]?.value.values).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'session-user' }),
    );
  });

  it('uses the session user ID instead of a body user ID when creating an interview', async () => {
    mocks.getSession.mockResolvedValue({ userId: 'session-user' });
    const firstInsert = {
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{
          id: 'interview-1',
          userId: 'session-user',
          jobTitle: 'Engineer',
          companyName: 'Kairos',
        }]),
      })),
    };
    const secondInsert = { values: vi.fn().mockResolvedValue(undefined) };
    const insert = vi.fn()
      .mockReturnValueOnce(firstInsert)
      .mockReturnValueOnce(secondInsert);
    mocks.getDb.mockReturnValue({ insert });

    const response = await postInterview(request('/api/interviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 'attacker-user',
        jobTitle: 'Engineer',
        companyName: 'Kairos',
      }),
    }));

    expect(response.status).toBe(200);
    expect(firstInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'session-user' }),
    );
  });
});
