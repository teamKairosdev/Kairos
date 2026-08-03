'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/lib/toast';
import EmptyState from '@/components/EmptyState';
import Spinner from '@/components/Spinner';
import {
  isCareerMockMode,
  mockId,
  mockUserId,
  readMockList,
  scoreMockCandidate,
  writeMockList,
  type MockCandidate,
  type MockCareerRecord,
  type MockDiaryRecord,
  type MockGoalRecord,
  type MockMatchRecord,
} from '../diary/mockStore';

const DISCLAIMER = '실제 채용 결과 데이터가 없는 결정론적 참고지표입니다. 지원 결과를 예측하지 않으며, 입력한 공고 요건과 기록의 비교에만 사용합니다.';

const REASON_LABELS: Record<string, string> = {
  GOAL_KEYWORD_MATCH: '목표 키워드 일치',
  CAREER_RECORD_MATCH: '경력 기록 일치',
  DIARY_THEME_MATCH: '일기 주제 일치',
  ROLE_ALIGNMENT: '기존 직무 연관',
  NO_DIRECT_KEYWORD_MATCH: '직접 일치 없음',
  ATS_REQUIREMENT_MATCH: '공고 요건 확인',
  ATS_REQUIREMENT_GAP: '공고 요건 보완',
  APPLICATION_FIT_REFERENCE: '지원 적합도 참고',
};

const EMPTY_FORM = {
  jobTitle: '',
  companyName: '',
  requirements: '',
  skills: '',
  experience: '',
  education: '',
};

interface CareerFitAssessmentView {
  atsScore: number;
  atsHeuristicScore: number;
  recommendationFit: '우선 검토' | '조건 확인' | '근거 부족';
  recommendationFitScore: number;
  evidence: string[];
  matchedRequirements: string[];
  missingRequirements: string[];
  uncertainty: string[];
  atsBreakdown: {
    skillsScore: number;
    experienceScore: number;
    educationScore: number;
    keywordDensityScore: number;
  };
  matchedKeywords: string[];
  actualHiringDataAvailable: false;
  disclaimer: string;
}

type StoredMatch = MockMatchRecord & { assessment?: CareerFitAssessmentView };
type CareerFitForm = typeof EMPTY_FORM;

const LOCAL_STOP_WORDS = new Set([
  '그리고', '대한', '대해', '있는', '경험', '업무', '역량', '성과', '목표', '통해', '위한', '및', '등',
  '경력', '기술', '요건', '요구사항', '자격', '필수', '우대', '관련', '가능', '보유', '이상', '지원',
]);

function localTokens(value: string): string[] {
  const normalized = value.normalize('NFKC').toLocaleLowerCase('ko-KR');
  const matches = normalized.match(/[가-힣]{2,}|[a-z0-9][a-z0-9+#./-]{1,}/gi) ?? [];
  return Array.from(new Set(matches.filter((token) => !LOCAL_STOP_WORDS.has(token))));
}

function localYears(value: string): number {
  const matches = Array.from(value.matchAll(/(\d+(?:\.\d+)?)\s*(?:\+\s*)?(?:년|years?|yrs?)/gi));
  return matches.length ? Math.max(...matches.map((match) => Number(match[1]))) : 0;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function localAssessment(
  form: CareerFitForm,
  careers: MockCareerRecord[],
  diary: MockDiaryRecord[],
  goals: MockGoalRecord[],
): CareerFitAssessmentView {
  const storedText = [
    ...careers.flatMap((career) => [career.company, career.role, career.period, career.description, ...(career.achievements ?? [])]),
    ...diary.flatMap((entry) => [entry.title ?? '', entry.content, ...(entry.tags ?? [])]),
    ...goals.flatMap((goal) => [goal.title, goal.description ?? '', Array.isArray(goal.metadata?.keywords) ? goal.metadata.keywords.join(' ') : '']),
  ].filter(Boolean).join(' ');
  const profileText = [form.skills, form.experience, form.education, storedText].filter(Boolean).join(' ');
  const requirementTokens = uniqueStrings(localTokens(form.requirements)).slice(0, 24);
  const profileTokens = new Set(localTokens(profileText));
  const matched = requirementTokens.filter((token) => profileTokens.has(token));
  const missing = requirementTokens.filter((token) => !profileTokens.has(token));
  const requiredYearsMatch = form.requirements.match(/(\d+(?:\.\d+)?)\s*(?:\+\s*)?(?:년|years?|yrs?)/i);
  const requiredYears = requiredYearsMatch ? Number(requiredYearsMatch[1]) : 0;
  const profileYears = localYears(form.experience);
  const roleTokens = localTokens(form.jobTitle);
  const roleMatches = roleTokens.filter((token) => profileTokens.has(token));
  const requirementCoverage = requirementTokens.length ? Math.round((matched.length / requirementTokens.length) * 100) : 0;
  const keywordDensityScore = requirementCoverage;
  const skillsScore = form.skills.trim() ? Math.min(100, matched.length * 20) : 0;
  const experienceScore = requiredYears > 0 ? Math.min(100, Math.round((profileYears / requiredYears) * 100)) : form.experience.trim() ? 70 : 0;
  const educationScore = form.education.trim() ? 70 : 0;
  const atsScore = Math.max(0, Math.min(100, Math.round(skillsScore * 0.4 + experienceScore * 0.3 + educationScore * 0.15 + keywordDensityScore * 0.15)));
  const recommendationFitScore = Math.max(0, Math.min(100, Math.round(atsScore * 0.6 + requirementCoverage * 0.3 + (roleTokens.length ? (roleMatches.length / roleTokens.length) * 10 : 0))));
  const criticalGap = requiredYears > 0 && (profileYears === 0 || profileYears < requiredYears);
  const recommendationFit = criticalGap
    ? recommendationFitScore >= 65 ? '조건 확인' : '근거 부족'
    : recommendationFitScore >= 75 ? '우선 검토' : recommendationFitScore >= 50 ? '조건 확인' : '근거 부족';
  const evidence = [
    ...(matched.length ? [`공고 요건 ${matched.slice(0, 6).join(', ')}를 입력 기록에서 확인`] : []),
    ...(requiredYears > 0 && profileYears >= requiredYears ? [`경력 요건 ${requiredYears}년 이상을 입력 경력 ${profileYears}년에서 확인`] : []),
    ...(roleMatches.length ? [`직무명과 입력 기록에서 ${roleMatches.slice(0, 4).join(', ')} 연결`] : []),
    `ATS ${atsScore}/100, 공고 요건 커버리지 ${requirementCoverage}% 및 직무 근거를 고정 규칙으로 조합`,
  ];
  const uncertainty = [
    '실제 채용 결과 데이터가 없어 지원 결과를 예측하지 않습니다.',
    '입력 텍스트에 없는 경력의 질, 포트폴리오, 면접 및 회사별 심사 기준은 판단하지 않습니다.',
    ...(!form.skills.trim() ? ['스킬 텍스트가 없어 기술 요건 판단이 제한됩니다.'] : []),
    ...(!form.experience.trim() ? ['경력 텍스트가 없어 경력 요건 판단이 제한됩니다.'] : []),
    ...(!form.education.trim() ? ['학력 텍스트가 없어 학력 요건 판단이 제한됩니다.'] : []),
  ];
  return {
    atsScore,
    atsHeuristicScore: atsScore,
    recommendationFit,
    recommendationFitScore,
    evidence: evidence.length ? evidence : ['입력 기록에서 직접 확인된 요건이 없습니다.'],
    matchedRequirements: matched,
    missingRequirements: [
      ...missing,
      ...(criticalGap ? [`경력 ${requiredYears}년 이상`] : []),
    ],
    uncertainty,
    atsBreakdown: { skillsScore, experienceScore, educationScore, keywordDensityScore },
    matchedKeywords: uniqueStrings([...matched, ...roleMatches]),
    actualHiringDataAvailable: false,
    disclaimer: DISCLAIMER,
  };
}

function assessmentRationale(assessment: CareerFitAssessmentView): string {
  const list = (values: string[]) => values.length ? values.join(', ') : '없음';
  return [
    `지원 적합도 참고지표: ${assessment.recommendationFit} (${assessment.recommendationFitScore}/100)`,
    `ATS 휴리스틱: ${assessment.atsScore}/100`,
    `근거: ${list(assessment.evidence)}`,
    `부족 요건: ${list(assessment.missingRequirements)}`,
    `불확실성: ${list(assessment.uncertainty)}`,
  ].join(' | ');
}

function parseAssessment(value: unknown): CareerFitAssessmentView | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const assessment = value as Partial<CareerFitAssessmentView>;
  if (typeof assessment.recommendationFit !== 'string' || typeof assessment.recommendationFitScore !== 'number') return undefined;
  return assessment as CareerFitAssessmentView;
}

function normalizeMatches(value: unknown): StoredMatch[] {
  const values = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && 'suggestions' in value
      ? (value as { suggestions?: unknown }).suggestions
      : value && typeof value === 'object' && 'jobTitle' in value
        ? [value]
        : [];
  if (!Array.isArray(values)) return [];
  return values as StoredMatch[];
}

function listOrFallback(values: string[]): string[] {
  return values.length ? values : ['확인된 항목 없음'];
}

export default function CareerMatchesPage() {
  const toast = useToast();
  const [goals, setGoals] = useState<MockGoalRecord[]>([]);
  const [matches, setMatches] = useState<StoredMatch[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [form, setForm] = useState<CareerFitForm>(EMPTY_FORM);
  const [assessment, setAssessment] = useState<CareerFitAssessmentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(false);
    try {
      if (isCareerMockMode()) {
        const localGoals = readMockList<MockGoalRecord>('mock_career_goals').map((goal) => ({ ...goal, milestones: goal.milestones || [] }));
        setGoals(localGoals);
        setSelectedGoalId((current) => current || localGoals[0]?.id || '');
        setMatches(readMockList<StoredMatch>('mock_career_matches'));
        return;
      }
      const [goalResponse, matchResponse] = await Promise.all([fetch('/api/career-goals'), fetch('/api/career-matches')]);
      if (!goalResponse.ok || !matchResponse.ok) throw new Error('load failed');
      const nextGoals = await goalResponse.json() as MockGoalRecord[];
      setGoals(nextGoals);
      setSelectedGoalId((current) => current || nextGoals[0]?.id || '');
      setMatches(normalizeMatches(await matchResponse.json()));
    } catch {
      setError(true);
      toast.add({ title: '지원 적합도 기록을 불러오지 못했습니다.', description: '잠시 후 다시 시도해주세요.', color: 'red' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function updateForm(field: keyof CareerFitForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function calculateAssessment() {
    if (!form.jobTitle.trim() || !form.requirements.trim()) {
      toast.add({ title: '직무명과 공고 요건을 입력해주세요.', description: '공고 원문에서 요구사항을 붙여넣어주세요.', color: 'red' });
      return;
    }
    if (!form.skills.trim() && !form.experience.trim() && !form.education.trim()) {
      toast.add({ title: '내 기록을 하나 이상 입력해주세요.', description: '스킬, 경력, 학력 중 하나를 입력해야 비교할 수 있습니다.', color: 'red' });
      return;
    }

    setCalculating(true);
    try {
      if (isCareerMockMode()) {
        const careers = readMockList<MockCareerRecord>('mock_careers');
        const diary = readMockList<MockDiaryRecord>('mock_career_diary');
        const localGoals = readMockList<MockGoalRecord>('mock_career_goals').map((goal) => ({ ...goal, milestones: goal.milestones || [] }));
        const scoringGoals = selectedGoalId ? localGoals.filter((goal) => goal.id === selectedGoalId) : localGoals;
        const nextAssessment = localAssessment(form, careers, diary, scoringGoals);
        const candidate: MockCandidate = {
          jobTitle: form.jobTitle.trim(),
          companyName: form.companyName.trim() || undefined,
          description: form.requirements.trim(),
          keywords: localTokens(form.requirements),
        };
        const legacy = scoreMockCandidate(candidate, careers, diary, scoringGoals);
        const saved: StoredMatch = {
          id: mockId('match'),
          userId: mockUserId(),
          goalId: selectedGoalId || null,
          jobTitle: candidate.jobTitle,
          companyName: candidate.companyName || null,
          matchScore: nextAssessment.recommendationFitScore,
          reasonCodes: uniqueStrings([
            ...legacy.reasonCodes,
            'APPLICATION_FIT_REFERENCE',
            ...(nextAssessment.matchedRequirements.length ? ['ATS_REQUIREMENT_MATCH'] : []),
            ...(nextAssessment.missingRequirements.length ? ['ATS_REQUIREMENT_GAP'] : []),
          ]),
          rationale: assessmentRationale(nextAssessment),
          status: 'saved',
          createdAt: new Date().toISOString(),
          recommendationType: 'candidate-job-recommendation',
          disclaimer: DISCLAIMER,
          assessment: nextAssessment,
        };
        const stored = readMockList<StoredMatch>('mock_career_matches');
        writeMockList('mock_career_matches', [saved, ...stored]);
        setAssessment(nextAssessment);
        setMatches((current) => [saved, ...current]);
      } else {
        const response = await fetch('/api/career-matches/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, goalId: selectedGoalId || undefined, save: true }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(data?.error || `HTTP ${response.status}`);
        }
        const data = await response.json() as { assessment?: CareerFitAssessmentView; savedSuggestion?: StoredMatch | null };
        const nextAssessment = data.assessment;
        if (!nextAssessment) throw new Error('참고지표 결과가 없습니다.');
        setAssessment(nextAssessment);
        if (data.savedSuggestion) setMatches((current) => [data.savedSuggestion as StoredMatch, ...current]);
      }
      toast.add({ title: '지원 적합도 참고지표를 계산하고 저장했습니다.', description: '아래 근거와 부족 요건을 확인한 뒤 원문과 함께 판단해주세요.', color: 'green' });
    } catch (error: unknown) {
      toast.add({ title: '지원 적합도 참고지표를 계산하지 못했습니다.', description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.', color: 'red' });
    } finally {
      setCalculating(false);
    }
  }

  async function updateMatchStatus(match: StoredMatch, status: string) {
    try {
      if (isCareerMockMode()) {
        const next = readMockList<StoredMatch>('mock_career_matches').map((item) => item.id === match.id ? { ...item, status } : item);
        writeMockList('mock_career_matches', next);
      } else {
        const response = await fetch(`/api/career-matches/${match.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }
      setMatches((current) => current.map((item) => item.id === match.id ? { ...item, status } : item));
    } catch (error: unknown) {
      toast.add({ title: '추천 상태를 저장하지 못했습니다.', description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.', color: 'red' });
    }
  }

  async function deleteMatch(match: StoredMatch) {
    try {
      if (isCareerMockMode()) {
        writeMockList('mock_career_matches', readMockList<StoredMatch>('mock_career_matches').filter((item) => item.id !== match.id));
      } else {
        const response = await fetch(`/api/career-matches/${match.id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }
      setMatches((current) => current.filter((item) => item.id !== match.id));
    } catch (error: unknown) {
      toast.add({ title: '추천을 삭제하지 못했습니다.', description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.', color: 'red' });
    }
  }

  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId);

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/career" className="text-xs font-semibold text-blue-600 hover:text-blue-700">경력 관리로 돌아가기</Link>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">Career Compass</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">원서 낭비 방지 나침반</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">공고 요건과 내 기록을 같은 규칙으로 비교해, 지원 전에 확인할 근거와 빈틈을 정리합니다.</p>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="커리어 계획 메뉴">
        <Link href="/career/diary" className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:border-blue-200 hover:text-blue-600">경력 일기</Link>
        <Link href="/career/goals" className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:border-blue-200 hover:text-blue-600">목표와 마일스톤</Link>
        <Link href="/career/matches" className="rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white">지원 나침반</Link>
      </nav>

      <section className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm md:p-8" aria-labelledby="compass-title">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Deterministic reference</p>
            <h2 id="compass-title" className="mt-2 text-xl font-bold">지원 전에 확인하는 작은 나침반</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">ATS 휴리스틱 점수와 공고 요건 커버리지를 고정 규칙으로 계산합니다. 이 값은 채용 결과나 지원 성공을 말하지 않고, 원문을 더 확인할 순서를 정하는 참고자료입니다.</p>
          </div>
          <div className="w-fit rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-emerald-200">실제 채용 결과 데이터 없음</div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs md:p-7" aria-labelledby="fit-form-title">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">Application Fit</p>
            <h2 id="fit-form-title" className="mt-1 text-lg font-bold text-gray-900">공고와 내 기록 비교</h2>
          </div>
          <p className="text-xs text-gray-400">입력한 텍스트는 참고지표 계산에 사용됩니다.</p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-gray-700">
                직무명 <span className="text-blue-500">*</span>
                <input value={form.jobTitle} onChange={(event) => updateForm('jobTitle', event.target.value)} placeholder="예: 데이터 분석가" className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm font-normal focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                회사명 <span className="font-normal text-gray-400">선택</span>
                <input value={form.companyName} onChange={(event) => updateForm('companyName', event.target.value)} placeholder="예: 가상회사" className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm font-normal focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </label>
            </div>
            <label className="block text-sm font-semibold text-gray-700">
              공고 요건 <span className="text-blue-500">*</span>
              <textarea rows={9} value={form.requirements} onChange={(event) => updateForm('requirements', event.target.value)} placeholder="채용공고의 자격요건과 우대사항을 붙여넣으세요.&#10;예: React, TypeScript, 데이터 분석 경험 3년 이상" className="mt-2 w-full resize-y rounded-xl border border-gray-200 px-3.5 py-3 text-sm font-normal leading-6 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              <span className="mt-1 block text-xs font-normal leading-5 text-gray-400">입력한 표현과 기록에 나타난 표현이 정확히 또는 토큰 단위로 연결되는지만 확인합니다.</span>
            </label>
          </div>

          <div className="space-y-5">
            <label className="block text-sm font-semibold text-gray-700">
              내 스킬
              <textarea rows={4} value={form.skills} onChange={(event) => updateForm('skills', event.target.value)} placeholder="사용 기술, 도구, 자격증, 프로젝트 키워드" className="mt-2 w-full resize-y rounded-xl border border-gray-200 px-3.5 py-3 text-sm font-normal leading-6 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              내 경력
              <textarea rows={4} value={form.experience} onChange={(event) => updateForm('experience', event.target.value)} placeholder="담당 업무, 기간, 성과, 프로젝트 경험" className="mt-2 w-full resize-y rounded-xl border border-gray-200 px-3.5 py-3 text-sm font-normal leading-6 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              내 학력
              <textarea rows={3} value={form.education} onChange={(event) => updateForm('education', event.target.value)} placeholder="최종 학력, 전공, 교육 이력" className="mt-2 w-full resize-y rounded-xl border border-gray-200 px-3.5 py-3 text-sm font-normal leading-6 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-gray-100 pt-5 md:flex-row md:items-end md:justify-between">
          <label className="block max-w-sm text-sm font-semibold text-gray-700">
            연결할 목표 <span className="font-normal text-gray-400">선택</span>
            <select value={selectedGoalId} onChange={(event) => setSelectedGoalId(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-normal focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
              <option value="">전체 목표 참고</option>
              {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
            </select>
          </label>
          <button type="button" onClick={calculateAssessment} disabled={calculating || loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50">
            {calculating && <Spinner className="h-4 w-4 rounded-full border-2 border-white border-t-transparent" />}
            {calculating ? '계산 중' : '계산하고 참고지표 저장'}
          </button>
        </div>
        {selectedGoal && <p className="mt-3 text-xs leading-5 text-gray-500">선택한 목표 <strong className="text-gray-700">{selectedGoal.title}</strong>의 키워드도 기존 추천 근거에 함께 반영합니다.</p>}
      </section>

      {assessment && (
        <section className="space-y-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 md:p-7" aria-labelledby="assessment-title" aria-live="polite">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Reference Result</p>
              <h2 id="assessment-title" className="mt-1 text-xl font-bold text-gray-900">지원 적합도 참고지표</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{assessment.disclaimer || DISCLAIMER}</p>
            </div>
            <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700">채용 결과 예측 아님</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white bg-white p-5">
              <p className="text-xs font-semibold text-gray-500">ATS 휴리스틱 점수</p>
              <p className="mt-2 text-3xl font-black text-gray-900">{assessment.atsHeuristicScore}<span className="ml-1 text-sm font-semibold text-gray-400">/100</span></p>
              <p className="mt-2 text-xs leading-5 text-gray-500">기술 키워드·경력·학력·키워드 밀도를 고정 규칙으로 비교한 값</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-700 p-5 text-white">
              <p className="text-xs font-semibold text-emerald-100">추천 적합도</p>
              <p className="mt-2 text-2xl font-black">{assessment.recommendationFit}</p>
              <p className="mt-1 text-3xl font-black">{assessment.recommendationFitScore}<span className="ml-1 text-sm font-semibold text-emerald-200">/100 참고값</span></p>
              <p className="mt-2 text-xs leading-5 text-emerald-100">지원 여부를 자동 결정하지 않는 비교 지표</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white bg-white p-5">
              <h3 className="text-sm font-bold text-gray-900">근거</h3>
              <ul className="mt-3 space-y-2 text-sm leading-5 text-gray-600">{listOrFallback(assessment.evidence).map((item) => <li key={item} className="border-l-2 border-emerald-300 pl-3">{item}</li>)}</ul>
            </div>
            <div className="rounded-2xl border border-white bg-white p-5">
              <h3 className="text-sm font-bold text-gray-900">부족 요건</h3>
              <ul className="mt-3 space-y-2 text-sm leading-5 text-gray-600">{listOrFallback(assessment.missingRequirements).map((item) => <li key={item} className="border-l-2 border-amber-300 pl-3">{item}</li>)}</ul>
            </div>
            <div className="rounded-2xl border border-white bg-white p-5">
              <h3 className="text-sm font-bold text-gray-900">불확실성</h3>
              <ul className="mt-3 space-y-2 text-sm leading-5 text-gray-600">{assessment.uncertainty.map((item) => <li key={item} className="border-l-2 border-slate-300 pl-3">{item}</li>)}</ul>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="saved-matches-title">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Saved References</p>
            <h2 id="saved-matches-title" className="mt-1 text-lg font-bold text-gray-900">저장한 지원 검토 기록</h2>
          </div>
          <p className="text-xs text-gray-400">내 계정에 귀속된 결과만 표시됩니다.</p>
        </div>
        {loading ? (
          <div className="space-y-4"><div className="h-40 animate-pulse rounded-2xl bg-white" /><div className="h-40 animate-pulse rounded-2xl bg-white" /></div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-10 text-center"><p className="text-sm font-semibold text-gray-800">지원 검토 기록을 불러오지 못했습니다.</p><button type="button" onClick={() => void loadData()} className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">다시 시도</button></div>
        ) : matches.length === 0 ? (
          <EmptyState icon="검토" title="아직 저장한 지원 검토 기록이 없습니다" description="공고 요건과 내 기록을 입력하면 지원 전에 확인할 내용을 정리할 수 있습니다." />
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <article key={match.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition hover:border-emerald-100 hover:shadow-card md:p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">지원 검토</span>
                      {match.status === 'saved' && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">저장됨</span>}
                      {match.status === 'dismissed' && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">보류됨</span>}
                    </div>
                    <h3 className="mt-3 break-words text-lg font-bold text-gray-900">{match.jobTitle}</h3>
                    {match.companyName && <p className="mt-1 text-sm font-medium text-gray-500">{match.companyName}</p>}
                    <p className="mt-3 text-sm leading-6 text-gray-600">{match.rationale}</p>
                    <div className="mt-4 flex flex-wrap gap-2">{match.reasonCodes.map((code) => <span key={code} className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-500">{REASON_LABELS[code] || code}</span>)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-5 md:flex-col md:items-center">
                    <div className="text-center"><p className="text-3xl font-black text-emerald-600">{match.assessment?.recommendationFitScore ?? match.matchScore}</p><p className="text-[11px] font-semibold text-gray-400">지원 참고값</p></div>
                    <div className="flex gap-2 md:flex-col">
                      {match.status !== 'saved' && <button type="button" onClick={() => void updateMatchStatus(match, 'saved')} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50">저장</button>}
                      {match.status !== 'dismissed' && <button type="button" onClick={() => void updateMatchStatus(match, 'dismissed')} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50">보류</button>}
                      <button type="button" onClick={() => void deleteMatch(match)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50">삭제</button>
                    </div>
                  </div>
                </div>
                {match.assessment && <div className="mt-5 grid gap-3 border-t border-gray-100 pt-5 text-xs leading-5 text-gray-500 md:grid-cols-3"><div><strong className="text-gray-700">근거</strong><p className="mt-1">{match.assessment.evidence.join(' · ')}</p></div><div><strong className="text-gray-700">부족 요건</strong><p className="mt-1">{listOrFallback(match.assessment.missingRequirements).join(' · ')}</p></div><div><strong className="text-gray-700">불확실성</strong><p className="mt-1">{match.assessment.uncertainty.join(' · ')}</p></div></div>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
