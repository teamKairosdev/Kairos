import { describe, expect, it } from 'vitest';
import {
  calculateCareerFit,
  calculateCareerMatch,
  hashJobReference,
  validateGoalMetadata,
} from '../../src/server/careerPlanning';

describe('career planning scoring', () => {
  const context = {
    careers: [{ role: '프론트엔드 개발자', description: 'React와 TypeScript로 성능 개선', achievements: ['컴포넌트 표준화'] }],
    diaryEntries: [{ title: '성능 회고', content: '사용자 경험과 협업을 돌아봄', tags: ['React'] }],
    goals: [{ title: '프론트엔드 역량 강화', description: 'React 기반 제품 분석', metadata: { keywords: ['TypeScript'] } }],
  };

  it('uses stable keyword overlap and reason codes instead of a provider', () => {
    const candidate = { jobTitle: '프론트엔드 엔지니어', companyName: '후보 회사', keywords: ['React'] };
    const first = calculateCareerMatch(candidate, context);
    const second = calculateCareerMatch(candidate, context);

    expect(first).toEqual(second);
    expect(first.matchScore).toBeGreaterThan(0);
    expect(first.reasonCodes).toContain('GOAL_KEYWORD_MATCH');
    expect(first.reasonCodes).toContain('CAREER_RECORD_MATCH');
    expect(first.rationale).toContain('키워드');
  });

  it('returns an explicit no-direct-match reason for unrelated candidates', () => {
    const result = calculateCareerMatch({ jobTitle: '조경 관리사', keywords: ['식물'] }, context);

    expect(result.matchScore).toBe(0);
    expect(result.reasonCodes).toEqual(['NO_DIRECT_KEYWORD_MATCH']);
  });

  it('normalizes exploratory metadata without presenting RIASEC as a diagnosis', () => {
    const riasec = validateGoalMetadata({
      riasec: {
        questions: [{ code: 'R', prompt: '질문', score: 5 }],
        result: { scores: { R: 100 }, order: ['R'] },
      },
    });
    const mandalart = validateGoalMetadata({
      mandalart: { cells: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => '행동')) },
    });

    expect(riasec.value?.riasec).toMatchObject({ mode: 'exploration' });
    expect(String((riasec.value?.riasec as { disclaimer?: string }).disclaimer)).toContain('진단');
    expect((mandalart.value?.mandalart as { cells: string[][] }).cells).toHaveLength(9);
    expect(validateGoalMetadata({ mandalart: { cells: [['한 칸']] } }).error).toContain('9행 9열');
  });

  it('hashes the same candidate reference deterministically', () => {
    const candidate = { jobTitle: '데이터 분석가', companyName: '후보 회사', keywords: ['SQL', '리서치'] };
    expect(hashJobReference(candidate)).toBe(hashJobReference({ ...candidate, keywords: ['SQL', '리서치'] }));
    expect(hashJobReference(candidate)).not.toBe(hashJobReference({ ...candidate, jobTitle: '프로덕트 매니저' }));
  });

  it('returns a deterministic fit reference with evidence, gaps, and uncertainty', () => {
    const input = {
      jobTitle: '프론트엔드 엔지니어',
      requirements: 'React, TypeScript, Docker, 경력 3년 이상, 학사 학위',
      skills: 'React와 TypeScript를 사용합니다.',
      experience: '프론트엔드 개발 2년',
      education: '컴퓨터공학 학사',
    };
    const first = calculateCareerFit(input);
    const second = calculateCareerFit(input);

    expect(first).toEqual(second);
    expect(first.atsHeuristicScore).toBe(first.atsScore);
    expect(first.evidence.length).toBeGreaterThan(0);
    expect(first.matchedRequirements).toContain('react');
    expect(first.missingRequirements).toContain('docker');
    expect(first.missingRequirements).toContain('경력 3년 이상');
    expect(first.uncertainty.join(' ')).toContain('실제 채용 결과 데이터');
    expect(first.actualHiringDataAvailable).toBe(false);
    expect(JSON.stringify(first)).not.toMatch(/합격률|성공을 보장/);
  });
});
