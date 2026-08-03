import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@/db', () => ({ getDb: mocks.getDb }));
vi.mock('@/db/schema', () => ({
  studioImages: { id: 'id', imageUrl: 'imageUrl', userId: 'userId' },
}));
vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  eq: vi.fn(),
}));
vi.mock('@/server/getSession', () => ({ getSession: mocks.getSession }));

import { GET } from '../../src/app/api/files/[...path]/route';

function requestFor(path: string[]) {
  return GET({} as never, { params: Promise.resolve({ path }) });
}

describe('studio file ownership enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ userId: 'user-a' });
  });

  it('fails closed when the database is unavailable', async () => {
    mocks.getDb.mockReturnValue(null);

    const response = await requestFor(['studio', 'image.png']);

    expect(response.status).toBe(503);
  });

  it('fails closed when the ownership query fails', async () => {
    const query = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error('database unavailable')),
    };
    mocks.getDb.mockReturnValue({ select: vi.fn().mockReturnValue(query) });

    const response = await requestFor(['studio', 'image.png']);

    expect(response.status).toBe(503);
  });

  it('returns not found when the file is not owned by the requester', async () => {
    const query = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    mocks.getDb.mockReturnValue({ select: vi.fn().mockReturnValue(query) });

    const response = await requestFor(['studio', 'image.png']);

    expect(response.status).toBe(404);
  });
});
