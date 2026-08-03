import { describe, expect, it } from 'vitest';
import {
  RESUME_COMPARE_MIN_COHORT_SIZE,
  analyzeResumeMetrics,
  buildResumeComparison,
  extractResumeKeywords,
} from '../../src/server/resumeCompare';

const completeResume = (index: number) => `
요약
제품을 개선한 소프트웨어 엔지니어 ${index}
경력
React와 TypeScript로 서비스 성능을 개선했습니다.
프로젝트
검색 프로젝트에서 응답 시간을 30% 줄였습니다.
학력
컴퓨터공학 학사
기술 및 역량
React TypeScript PostgreSQL Docker
`;

describe('resume comparison metrics', () => {
  it('calculates section, keyword, sentence, and job-match metrics without returning source text', () => {
    const result = analyzeResumeMetrics(
      completeResume(1),
      'React, TypeScript, Docker, PostgreSQL 경험을 요구합니다.',
    );

    expect(result.sectionCompleteness.score).toBe(100);
    expect(result.sectionCompleteness.missing).toEqual([]);
    expect(result.keywordCount).toBeGreaterThan(0);
    expect(result.sentenceLength.sentenceCount).toBeGreaterThan(0);
    expect(result.sentenceLength.averageWords).toBeGreaterThan(0);
    expect(result.jobMatch.status).toBe('calculated');
    expect(result.jobMatch.score).not.toBeNull();
    expect(JSON.stringify(result)).not.toContain('서비스 성능을 개선했습니다');
  });

  it('extracts unique meaningful keywords deterministically', () => {
    expect(extractResumeKeywords('React React TypeScript 개발 및 업무 경험')).toEqual(['react', 'typescript']);
  });

  it('uses an explicitly labelled example when the privacy minimum is not met', () => {
    const result = buildResumeComparison(completeResume(0), [
      { userId: 'user-1', originalContent: completeResume(1) },
    ], 'React와 TypeScript 경험');

    expect(result.baseline.source).toBe('example');
    expect(result.baseline.status).toBe('insufficient_data');
    expect(result.baseline.isActual).toBe(false);
    expect(result.baseline.label).toContain('기준선 예시');
    expect(result.baseline.notice).toContain('실제 사용자 평균이 아닌');
    expect(result.baseline.sampleSize).toBe(1);
    expect(result.baseline.minimumSampleSize).toBe(RESUME_COMPARE_MIN_COHORT_SIZE);
  });

  it('aggregates only distinct users and never returns cohort source content', () => {
    const cohort = Array.from({ length: RESUME_COMPARE_MIN_COHORT_SIZE }, (_, index) => ({
      userId: `user-${index}`,
      originalContent: completeResume(index),
    }));
    cohort.push({ userId: 'user-0', originalContent: 'private second resume text' });

    const result = buildResumeComparison(completeResume(99), cohort);
    const serialized = JSON.stringify(result);

    expect(result.baseline.source).toBe('cohort');
    expect(result.baseline.status).toBe('actual');
    expect(result.baseline.sampleSize).toBe(RESUME_COMPARE_MIN_COHORT_SIZE);
    expect(serialized).not.toContain('private second resume text');
    expect(serialized).not.toContain('user-0');
    expect(result.privacyNotice).toContain('원문');
  });

  it('does not claim a job match when no job description is provided', () => {
    const result = buildResumeComparison(completeResume(0), []);

    expect(result.current.jobMatch.status).toBe('not_provided');
    expect(result.current.jobMatch.score).toBeNull();
    expect(result.comparisons.jobMatch.delta).toBeNull();
    expect(result.weaknesses.join(' ')).toContain('채용 공고');
    expect(result.suggestions.join(' ')).toContain('채용 공고');
  });
});
