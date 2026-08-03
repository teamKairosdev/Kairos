import { describe, expect, it } from 'vitest';
import { calculateCommunityReputation } from '../../src/app/api/community/reputation/route';
import { calculateMissionCheckInSummary } from '../../src/app/api/growth-events/check-ins/route';

describe('community MVP calculations', () => {
  it('uses fixed activity points and does not treat them as a skill score', () => {
    const result = calculateCommunityReputation([
      { eventType: 'community_answer' },
      { eventType: 'community_answer' },
      { eventType: 'community_feedback' },
    ]);

    expect(result).toEqual({
      reputationPoints: 8,
      points: 8,
      answerCount: 2,
      feedbackCount: 1,
    });
  });

  it('counts unique check-in dates and calculates the latest consecutive run', () => {
    const result = calculateMissionCheckInSummary([
      { occurredAt: '2026-08-02T09:00:00.000Z', metadata: { checkInDate: '2026-08-02' } },
      { occurredAt: '2026-08-03T09:00:00.000Z', metadata: { checkInDate: '2026-08-03' } },
      { occurredAt: '2026-08-03T12:00:00.000Z', metadata: { checkInDate: '2026-08-03' } },
      { occurredAt: '2026-08-04T09:00:00.000Z', metadata: { checkInDate: '2026-08-04' } },
    ], new Date('2026-08-04T15:00:00.000Z'));

    expect(result).toEqual({ completedCount: 3, streakDays: 3 });
  });

  it('does not keep an old streak alive after a gap', () => {
    const result = calculateMissionCheckInSummary([
      { occurredAt: '2026-07-31T09:00:00.000Z' },
      { occurredAt: '2026-08-02T09:00:00.000Z' },
    ], new Date('2026-08-02T15:00:00.000Z'));

    expect(result).toEqual({ completedCount: 2, streakDays: 1 });
  });
});
