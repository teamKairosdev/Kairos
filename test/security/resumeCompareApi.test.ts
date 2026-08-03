import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@/db', () => ({ getDb: mocks.getDb }));
vi.mock('@/server/getSession', () => ({ getSession: mocks.getSession }));
vi.mock('@/db/schema', () => ({ resumes: { id: {}, userId: {}, originalContent: {} } }));
vi.mock('drizzle-orm', () => ({ and: vi.fn(), eq: vi.fn(), ne: vi.fn() }));

import { GET as getCompare, POST as postCompare } from '../../src/app/api/resumes/[id]/compare/route';

function request(path: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(`http://localhost${path}`, init);
}

function databaseFor(resume: unknown, cohort: unknown[] = []) {
  const where = vi.fn()
    .mockResolvedValueOnce(resume ? [resume] : [])
    .mockResolvedValueOnce(cohort);
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  mocks.getDb.mockReturnValue({ select });
  return { select, from, where };
}

describe('resume comparison API privacy boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ userId: 'user-a' });
    mocks.getDb.mockReturnValue(null);
  });

  it('rejects unauthenticated requests before opening the database', async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await getCompare(
      request('/api/resumes/resume-a/compare'),
      { params: Promise.resolve({ id: 'resume-a' }) },
    );

    expect(response.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated POST before reading its body', async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await postCompare(
      request('/api/resumes/resume-a/compare', { method: 'POST', body: 'not-json' }),
      { params: Promise.resolve({ id: 'resume-a' }) },
    );

    expect(response.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it('does not compare a resume that is not owned by the session user', async () => {
    const { select } = databaseFor(null);

    const response = await getCompare(
      request('/api/resumes/resume-a/compare'),
      { params: Promise.resolve({ id: 'resume-a' }) },
    );

    expect(response.status).toBe(404);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('returns aggregate metrics without another user resume body or identifier', async () => {
    const cohort = Array.from({ length: 5 }, (_, index) => ({
      userId: `other-user-${index}`,
      originalContent: `다른 사용자의 비공개 원문 ${index}`,
    }));
    databaseFor({ id: 'resume-a', originalContent: '경력\n프로젝트\n학력\n기술 React' }, cohort);

    const response = await getCompare(
      request('/api/resumes/resume-a/compare?jobDescription=React%20경험'),
      { params: Promise.resolve({ id: 'resume-a' }) },
    );
    const payload = await response.json() as Record<string, unknown>;
    const serialized = JSON.stringify(payload);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(serialized).not.toContain('다른 사용자의 비공개 원문');
    expect(serialized).not.toContain('other-user-0');
    expect(payload).toHaveProperty('current');
    expect(payload).toHaveProperty('baseline');
    expect(payload).toHaveProperty('weaknesses');
    expect(payload).toHaveProperty('suggestions');
    expect(payload).toHaveProperty('privacyNotice');
  });
});
