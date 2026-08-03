import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@/db', () => ({ getDb: mocks.getDb }));
vi.mock('@/server/getSession', () => ({ getSession: mocks.getSession }));
vi.mock('@/db/schema', () => ({
  careerDiaryEntries: {},
  careerGoals: {},
  careerMilestones: {},
  careerMatchSuggestions: {},
  careers: {},
}));
vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
  eq: vi.fn(),
}));

import { POST as postDiary } from '../../src/app/api/career-diary/route';
import { DELETE as deleteDiary } from '../../src/app/api/career-diary/[id]/route';
import { POST as postGoal } from '../../src/app/api/career-goals/route';
import { PATCH as patchGoal } from '../../src/app/api/career-goals/[id]/route';
import { POST as postFit } from '../../src/app/api/career-matches/analyze/route';
import { GET as getMatches, POST as postMatches } from '../../src/app/api/career-matches/route';
import { resetCareerPlanningFallbackStore } from '../../src/server/careerPlanning';

function request(path: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(`http://localhost${path}`, init);
}

describe('career planning ownership boundaries', () => {
  beforeEach(() => {
    resetCareerPlanningFallbackStore();
    vi.clearAllMocks();
    mocks.getDb.mockReturnValue(null);
    mocks.getSession.mockResolvedValue({ userId: 'user-a' });
  });

  it('does not let another user delete a diary entry', async () => {
    const created = await postDiary(request('/api/career-diary', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '기록', content: '개인 기록', occurredAt: '2026-08-03', tags: ['협업'] }),
    }));
    const entry = await created.json() as { id: string };

    mocks.getSession.mockResolvedValue({ userId: 'user-b' });
    const denied = await deleteDiary(request(`/api/career-diary/${entry.id}`, { method: 'DELETE' }), { params: Promise.resolve({ id: entry.id }) });
    expect(denied.status).toBe(404);

    mocks.getSession.mockResolvedValue({ userId: 'user-a' });
    const allowed = await deleteDiary(request(`/api/career-diary/${entry.id}`, { method: 'DELETE' }), { params: Promise.resolve({ id: entry.id }) });
    expect(allowed.status).toBe(200);
  });

  it('does not let another user complete a goal', async () => {
    const created = await postGoal(request('/api/career-goals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '학습 목표', keywords: ['분석'] }),
    }));
    const goal = await created.json() as { id: string };

    mocks.getSession.mockResolvedValue({ userId: 'user-b' });
    const denied = await patchGoal(request(`/api/career-goals/${goal.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    }), { params: Promise.resolve({ id: goal.id }) });
    expect(denied.status).toBe(404);
  });

  it('creates a transparent candidate-job recommendation without user matching', async () => {
    const response = await postMatches(request('/api/career-matches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ candidates: [{ jobTitle: '데이터 분석가', keywords: ['분석'] }] }),
    }));
    const result = await response.json() as { jobTitle: string; recommendationType: string; disclaimer: string; reasonCodes: string[] };

    expect(response.status).toBe(200);
    expect(result.jobTitle).toBe('데이터 분석가');
    expect(result.recommendationType).toBe('candidate-job-recommendation');
    expect(result.disclaimer).toContain('사용자 간 자동 매칭');
    expect(result.reasonCodes).toContain('NO_DIRECT_KEYWORD_MATCH');
  });

  it('calculates and saves a fit reference under the requesting user', async () => {
    const response = await postFit(request('/api/career-matches/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jobTitle: '프론트엔드 엔지니어',
        requirements: 'React, TypeScript, Docker, 경력 3년 이상',
        skills: 'React와 TypeScript',
        experience: '2년 경력',
        education: '학사',
        save: true,
      }),
    }));
    const result = await response.json() as {
      assessment: { atsHeuristicScore: number; evidence: string[]; missingRequirements: string[]; uncertainty: string[]; actualHiringDataAvailable: boolean };
      saved: boolean;
      savedSuggestion: { userId: string; status: string } | null;
    };

    expect(response.status).toBe(200);
    expect(result.assessment.atsHeuristicScore).toBeGreaterThanOrEqual(0);
    expect(result.assessment.evidence.length).toBeGreaterThan(0);
    expect(result.assessment.missingRequirements).toContain('docker');
    expect(result.assessment.uncertainty.join(' ')).toContain('실제 채용 결과 데이터');
    expect(result.assessment.actualHiringDataAvailable).toBe(false);
    expect(result.saved).toBe(true);
    expect(result.savedSuggestion).toMatchObject({ userId: 'user-a', status: 'saved' });

    mocks.getSession.mockResolvedValue({ userId: 'user-b' });
    const otherUserMatches = await getMatches(request('/api/career-matches'));
    expect(await otherUserMatches.json()).toEqual([]);

    mocks.getSession.mockResolvedValue({ userId: 'user-a' });
    const ownMatches = await getMatches(request('/api/career-matches'));
    expect((await ownMatches.json()) as unknown[]).toHaveLength(1);
  });

  it('keeps the existing career match suggestion endpoint connected to fit analysis', async () => {
    const response = await postMatches(request('/api/career-matches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jobTitle: '데이터 분석가',
        requirements: 'SQL, Python, 경력 2년 이상',
        skills: 'SQL',
        experience: '2년 경력',
        education: '학사',
      }),
    }));
    const result = await response.json() as {
      assessment?: { recommendationFitScore: number; missingRequirements: string[] };
      reasonCodes: string[];
    };

    expect(response.status).toBe(200);
    expect(result.assessment?.recommendationFitScore).toBeGreaterThanOrEqual(0);
    expect(result.assessment?.missingRequirements).toContain('python');
    expect(result.reasonCodes).toContain('APPLICATION_FIT_REFERENCE');
  });
});
