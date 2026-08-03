import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getSession: vi.fn(),
  eq: vi.fn((left: unknown, right: unknown) => ({ operator: 'eq', left, right })),
  ne: vi.fn((left: unknown, right: unknown) => ({ operator: 'ne', left, right })),
  inArray: vi.fn((left: unknown, right: unknown) => ({ operator: 'inArray', left, right })),
}));

vi.mock('@/db', () => ({ getDb: mocks.getDb }));
vi.mock('@/server/getSession', () => ({ getSession: mocks.getSession }));
vi.mock('@/db/schema', () => ({
  careers: {
    id: 'careers.id',
    userId: 'careers.userId',
    company: 'careers.company',
    role: 'careers.role',
    period: 'careers.period',
    description: 'careers.description',
    achievements: 'careers.achievements',
    createdAt: 'careers.createdAt',
  },
  communityPosts: {
    userId: 'communityPosts.userId',
    category: 'communityPosts.category',
  },
  users: {
    id: 'users.id',
    name: 'users.name',
  },
}));
vi.mock('drizzle-orm', () => ({
  eq: mocks.eq,
  ne: mocks.ne,
  inArray: mocks.inArray,
}));

import { GET } from '../../src/app/api/community/matches/route';
import { resetCommunityMatchRateLimit } from '../../src/server/communityMatches';

function request(path: string) {
  return new NextRequest(`http://localhost${path}`);
}

const currentCareer = {
  id: 'career-a',
  userId: 'user-a',
  company: 'Private Current Company',
  role: '데이터 엔지니어',
  period: '2019 - 2023',
  description: '데이터 파이프라인을 설계하고 지표 운영을 개선했습니다.',
  achievements: ['ETL 자동화'],
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

const candidateCareer = {
  id: 'career-b',
  userId: 'user-b',
  company: 'Private Candidate Company',
  role: '데이터 엔지니어',
  period: '2019 - 2023',
  description: '데이터 파이프라인을 설계하고 지표 운영을 개선했습니다.',
  achievements: ['ETL 자동화'],
  createdAt: new Date('2024-01-02T00:00:00.000Z'),
  displayName: '민지',
};

function mockDatabase() {
  let selectCount = 0;
  const select = vi.fn(() => {
    const currentSelect = selectCount;
    selectCount += 1;

    if (currentSelect === 0) {
      return {
        from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([currentCareer]) })),
      };
    }

    if (currentSelect === 1) {
      return {
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({ where: vi.fn().mockResolvedValue([candidateCareer]) })),
        })),
      };
    }

    return {
      from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ userId: 'user-b', category: 'career_tip' }]) })),
    };
  });

  return { select };
}

describe('community matches API boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCommunityMatchRateLimit();
    mocks.getSession.mockResolvedValue(null);
    mocks.getDb.mockReturnValue(null);
  });

  it('requires the verified session and does not query the database', async () => {
    const response = await GET(request('/api/community/matches?userId=user-b&limit=100'));

    expect(response.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it('returns an explicit empty result when the database is unavailable', async () => {
    mocks.getSession.mockResolvedValue({ userId: 'user-a' });

    const response = await GET(request('/api/community/matches'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.matches).toEqual([]);
    expect(body.meta.emptyReason).toBe('DATABASE_UNAVAILABLE');
  });

  it('uses the session owner, caps top N, and exposes only the public DTO', async () => {
    mocks.getSession.mockResolvedValue({ userId: 'user-a' });
    mocks.getDb.mockReturnValue(mockDatabase());

    const response = await GET(request('/api/community/matches?userId=user-attacker&limit=999'));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.meta.limit).toBe(10);
    expect(body.matches).toHaveLength(1);
    expect(body.matches[0]).toMatchObject({ displayName: '민지', role: '데이터 엔지니어' });
    expect(body.matches[0]).not.toHaveProperty('userId');
    expect(serialized).not.toContain('Private Candidate Company');
    expect(serialized).not.toContain('Private Current Company');
    expect(serialized).not.toContain('데이터 파이프라인을 설계하고');
    expect(mocks.eq).toHaveBeenCalledWith('careers.userId', 'user-a');
    expect(mocks.ne).toHaveBeenCalledWith('careers.userId', 'user-a');
  });

  it('rejects invalid limits and rate limits repeated requests per session user', async () => {
    mocks.getSession.mockResolvedValue({ userId: 'user-a' });

    const invalid = await GET(request('/api/community/matches?limit=0'));
    expect(invalid.status).toBe(400);
    expect(mocks.getDb).not.toHaveBeenCalled();

    for (let requestNumber = 0; requestNumber < 30; requestNumber += 1) {
      expect((await GET(request('/api/community/matches'))).status).toBe(200);
    }

    const limited = await GET(request('/api/community/matches'));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
  });
});
