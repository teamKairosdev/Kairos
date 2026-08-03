import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getSession: vi.fn(),
  eq: vi.fn((left: unknown, right: unknown) => ({ operator: 'eq', left, right })),
  and: vi.fn((...conditions: unknown[]) => ({ operator: 'and', conditions })),
  inArray: vi.fn((left: unknown, right: unknown) => ({ operator: 'inArray', left, right })),
  desc: vi.fn((value: unknown) => ({ operator: 'desc', value })),
  sql: vi.fn(() => 'sql'),
}));

vi.mock('@/db', () => ({ getDb: mocks.getDb }));
vi.mock('@/server/getSession', () => ({ getSession: mocks.getSession }));
vi.mock('@/db/schema', () => ({
  communityPosts: {
    id: 'communityPosts.id',
    userId: 'communityPosts.userId',
    title: 'communityPosts.title',
    content: 'communityPosts.content',
    category: 'communityPosts.category',
    isAnonymous: 'communityPosts.isAnonymous',
    likesCount: 'communityPosts.likesCount',
    createdAt: 'communityPosts.createdAt',
  },
  users: {
    id: 'users.id',
    name: 'users.name',
    avatarUrl: 'users.avatarUrl',
  },
  growthEvents: {
    id: 'growthEvents.id',
    userId: 'growthEvents.userId',
    eventType: 'growthEvents.eventType',
    metadata: 'growthEvents.metadata',
    occurredAt: 'growthEvents.occurredAt',
  },
}));
vi.mock('drizzle-orm', () => ({
  and: mocks.and,
  desc: mocks.desc,
  eq: mocks.eq,
  inArray: mocks.inArray,
  sql: mocks.sql,
}));

import { GET as getCommunity, POST as createCommunity } from '../../src/app/api/community/route';
import { GET as getReputation } from '../../src/app/api/community/reputation/route';
import { POST as createCheckIn } from '../../src/app/api/growth-events/check-ins/route';

function request(path: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(`http://localhost${path}`, init);
}

function postListDatabase(posts: unknown[]) {
  let selectCount = 0;
  const select = vi.fn(() => {
    if (selectCount === 0) {
      selectCount += 1;
      const builder = {
        leftJoin: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        limit: vi.fn(),
        offset: vi.fn(),
      };
      builder.leftJoin.mockReturnValue(builder);
      builder.where.mockReturnValue(builder);
      builder.orderBy.mockReturnValue(builder);
      builder.limit.mockReturnValue(builder);
      builder.offset.mockResolvedValue(posts);
      return { from: vi.fn(() => builder) };
    }

    return {
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      })),
    };
  });
  return { select };
}

describe('community MVP API boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(null);
    mocks.getDb.mockReturnValue(null);
  });

  it('requires a session for private reputation data', async () => {
    const response = await getReputation(request('/api/community/reputation?userId=other-user'));

    expect(response.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it('removes the anonymous author identity and keeps owner state separate', async () => {
    mocks.getSession.mockResolvedValue({ userId: 'viewer-user' });
    mocks.getDb.mockReturnValue(postListDatabase([{
      id: 'post-1',
      userId: 'author-user',
      title: '익명 글',
      content: '내용',
      category: 'qna',
      isAnonymous: true,
      likesCount: 0,
      createdAt: new Date('2026-08-04T00:00:00.000Z'),
      user: { name: 'Author', avatarUrl: null, email: 'author@example.com' },
    }]));

    const response = await getCommunity(request('/api/community'));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.posts[0]).toMatchObject({ isAnonymous: true, user: null, isOwner: false });
    expect(body.posts[0]).not.toHaveProperty('userId');
    expect(serialized).not.toContain('author@example.com');
    expect(serialized).not.toContain('author-user');
  });

  it('stores the anonymous flag from the request without returning the source user ID', async () => {
    mocks.getSession.mockResolvedValue({ userId: 'author-user' });
    const inserted = {
      id: 'post-1',
      userId: 'author-user',
      title: '익명 글',
      content: '내용',
      category: 'career_tip',
      isAnonymous: true,
      likesCount: 0,
      createdAt: new Date('2026-08-04T00:00:00.000Z'),
    };
    const values = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([inserted]) }));
    mocks.getDb.mockReturnValue({ insert: vi.fn(() => ({ values })) });

    const response = await createCommunity(request('/api/community', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '익명 글', content: '내용', isAnonymous: true }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ userId: 'author-user', isAnonymous: true }));
    expect(body).not.toHaveProperty('userId');
    expect(body).not.toHaveProperty('email');
    expect(body).toMatchObject({ isAnonymous: true, isOwner: true, user: null });
  });

  it('records a mission as a user check-in and exposes no coupon data', async () => {
    mocks.getSession.mockResolvedValue({ userId: 'user-a' });
    const values = vi.fn(() => ({
      returning: vi.fn().mockResolvedValue([{
        occurredAt: new Date(),
        metadata: {
          source: 'user_check_in',
          missionId: 'daily_economy_news',
          checkInDate: new Date().toISOString().slice(0, 10),
        },
      }]),
    }));
    const select = vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
    }));
    mocks.getDb.mockReturnValue({ select, insert: vi.fn(() => ({ values })) });

    const response = await createCheckIn(request('/api/growth-events/check-ins', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ missionId: 'daily_economy_news' }),
    }));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(201);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'mission_check_in',
      metadata: expect.objectContaining({ source: 'user_check_in' }),
    }));
    expect(body.completedCount).toBe(1);
    expect(body.streakDays).toBe(1);
    expect(body.reward.status).toBe('pending_policy');
    expect(serialized).not.toContain('coupon');
  });
});
