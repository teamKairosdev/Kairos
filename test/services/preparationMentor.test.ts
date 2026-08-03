import { describe, expect, it } from 'vitest';
import { analyzePreparationText } from '../../src/server/preparationTone';
import { calculateMentorMetrics } from '../../src/server/mentor';

describe('preparation tone deterministic checks', () => {
  it('detects dictionary terms and masks personal information before an AI call', () => {
    const result = analyzePreparationText('씨발 연락은 test@example.com 또는 010-1234-5678로 주세요.');

    expect(result.profanity.detected).toBe(true);
    expect(result.profanity.matches).toContain('씨발');
    expect(result.personalInformation.detected).toBe(true);
    expect(result.personalInformation.types).toEqual(expect.arrayContaining(['이메일', '전화번호']));
    expect(result.redactedText).not.toContain('test@example.com');
    expect(result.redactedText).not.toContain('010-1234-5678');
  });

  it('returns a clean result when no dictionary finding exists', () => {
    const result = analyzePreparationText('안녕하세요. 지원 일정에 대해 문의드립니다.');

    expect(result.profanity).toEqual({ detected: false, matches: [] });
    expect(result.personalInformation).toMatchObject({ detected: false, types: [], matches: [] });
    expect(result.redactedText).toBe('안녕하세요. 지원 일정에 대해 문의드립니다.');
  });
});

describe('mentor metrics', () => {
  it('calculates completion rate, completed task count, and a current consecutive-day streak', () => {
    const tasks = [
      { status: 'completed', completedAt: new Date('2026-01-03T08:00:00.000Z'), updatedAt: new Date('2026-01-03T08:00:00.000Z') },
      { status: 'completed', completedAt: new Date('2026-01-02T08:00:00.000Z'), updatedAt: new Date('2026-01-02T08:00:00.000Z') },
      { status: 'todo', completedAt: null, updatedAt: new Date('2026-01-01T08:00:00.000Z') },
    ] as const;

    expect(calculateMentorMetrics(tasks, new Date('2026-01-03T20:00:00.000Z'))).toEqual({
      totalTaskCount: 3,
      completedTaskCount: 2,
      completionRate: 67,
      streakDays: 2,
    });
  });

  it('does not report a current streak when the latest completion is stale', () => {
    const tasks = [
      { status: 'completed', completedAt: new Date('2026-01-01T08:00:00.000Z'), updatedAt: new Date('2026-01-01T08:00:00.000Z') },
    ] as const;

    expect(calculateMentorMetrics(tasks, new Date('2026-01-04T20:00:00.000Z')).streakDays).toBe(0);
  });
});
