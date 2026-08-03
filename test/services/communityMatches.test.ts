import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildCommunityCareerMatches,
  calculateCareerSimilarity,
  consumeCommunityMatchRateLimit,
  resetCommunityMatchRateLimit,
  type CareerRecord,
  type CandidateCareerRecord,
} from '../../src/server/communityMatches';

function career(overrides: Partial<CareerRecord> = {}): CareerRecord {
  return {
    id: 'career-1',
    userId: 'user-a',
    company: 'Northstar Labs',
    role: '데이터 엔지니어',
    period: '2019 - 2023',
    description: '데이터 파이프라인을 설계하고 분석팀과 지표 운영을 개선했습니다.',
    achievements: ['ETL 자동화', '지표 품질 개선'],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function candidate(overrides: Partial<CandidateCareerRecord> = {}): CandidateCareerRecord {
  return {
    ...career({ id: 'career-2', userId: 'user-b' }),
    displayName: '민지',
    ...overrides,
  };
}

describe('community career matching', () => {
  beforeEach(() => {
    resetCommunityMatchRateLimit();
  });

  it('returns deterministic scores and safe public match data', () => {
    const current = career();
    const other = candidate({
      company: 'Sensitive Other Company',
      displayName: 'someone@example.com',
    });
    const posts = [
      { userId: 'user-b', category: 'career_tip' },
      { userId: 'user-b', category: 'qna' },
    ];

    const first = buildCommunityCareerMatches([current], [other], posts, 5);
    const second = buildCommunityCareerMatches([current], [other], posts, 5);

    expect(first).toEqual(second);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      displayName: '커뮤니티 사용자',
      role: '데이터 엔지니어',
      score: 85,
      community: { postCount: 2, categories: ['career_tip', 'qna'] },
    });
    expect(first[0]?.reasonCodes).toEqual([
      'ROLE_SIMILARITY',
      'CAREER_THEME_SIMILARITY',
      'ACHIEVEMENT_PATTERN_SIMILARITY',
      'EXPERIENCE_LEVEL_ALIGNED',
    ]);

    const serialized = JSON.stringify(first[0]);
    expect(serialized).not.toContain('Sensitive Other Company');
    expect(serialized).not.toContain('데이터 파이프라인을 설계하고');
    expect(serialized).not.toContain('ETL 자동화');
    expect(serialized).not.toContain('someone@example.com');
    expect(first[0]).not.toHaveProperty('userId');
  });

  it('uses role, company, description, and achievements in the deterministic score', () => {
    const exact = calculateCareerSimilarity(career(), career({ id: 'career-2', userId: 'user-b' }));
    const roleOnly = calculateCareerSimilarity(
      career(),
      career({
        id: 'career-3',
        userId: 'user-c',
        company: 'Different Company',
        description: '완전히 다른 업무를 담당했습니다.',
        achievements: ['새로운 성과'],
      }),
    );

    expect(exact.score).toBe(100);
    expect(roleOnly.score).toBeGreaterThan(0);
    expect(roleOnly.score).toBeLessThan(exact.score);
    expect(roleOnly.reasonCodes).toContain('ROLE_SIMILARITY');
  });

  it('does not return unrelated users just to fill the top N', () => {
    const matches = buildCommunityCareerMatches(
      [career()],
      [candidate({
        id: 'career-unrelated',
        userId: 'user-unrelated',
        displayName: '다른 사용자',
        company: 'Studio',
        role: '콘텐츠 기획자',
        description: '전혀 다른 주제의 업무입니다.',
        achievements: ['행사 운영'],
      })],
      [],
      3,
    );

    expect(matches).toEqual([]);
  });

  it('allows only the configured number of requests in a rate-limit window', () => {
    for (let request = 0; request < 30; request += 1) {
      expect(consumeCommunityMatchRateLimit('user-a', 1_000)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    }

    expect(consumeCommunityMatchRateLimit('user-a', 1_000)).toMatchObject({ allowed: false });
    expect(consumeCommunityMatchRateLimit('user-b', 1_000).allowed).toBe(true);
    expect(consumeCommunityMatchRateLimit('user-a', 301_001).allowed).toBe(true);
  });
});
