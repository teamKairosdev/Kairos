'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/lib/toast';
import EmptyState from '@/components/EmptyState';
import Spinner from '@/components/Spinner';
import {
  isCareerMockMode,
  mockId,
  mockUserId,
  readMockList,
  writeMockList,
  type MockGoalRecord,
  type MockMilestoneRecord,
} from '../diary/mockStore';

const RIASEC_TYPES = [
  { code: 'R', label: '현실형', prompt: '직접 만들거나 도구를 다루어 눈에 보이는 결과를 낸 활동이 얼마나 에너지를 주었나요?' },
  { code: 'I', label: '탐구형', prompt: '원인을 분석하고 복잡한 문제의 구조를 밝혀낸 활동이 얼마나 에너지를 주었나요?' },
  { code: 'A', label: '예술형', prompt: '새로운 방식이나 표현을 시도해 결과물의 방향을 바꾼 활동이 얼마나 에너지를 주었나요?' },
  { code: 'S', label: '사회형', prompt: '다른 사람을 돕고 설명하며 함께 성장한 활동이 얼마나 에너지를 주었나요?' },
  { code: 'E', label: '진취형', prompt: '방향을 제안하고 사람과 자원을 움직여 변화를 만든 활동이 얼마나 에너지를 주었나요?' },
  { code: 'C', label: '관습형', prompt: '자료와 절차를 정리해 반복 가능한 방식으로 안정성을 높인 활동이 얼마나 에너지를 주었나요?' },
] as const;

type GoalForm = { title: string; description: string; targetDate: string; priority: string; keywords: string };
type MilestoneForm = { title: string; description: string; dueDate: string };

function newGoalForm(): GoalForm {
  return { title: '', description: '', targetDate: '', priority: '0', keywords: '' };
}

function newMilestoneForm(): MilestoneForm {
  return { title: '', description: '', dueDate: '' };
}

function blankMandala(): string[][] {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ''));
}

function dateInput(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

function formatDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function normalizeGoal(value: Partial<MockGoalRecord>): MockGoalRecord {
  const now = new Date().toISOString();
  return {
    id: value.id || mockId('goal'),
    userId: value.userId || mockUserId(),
    title: value.title || '새 목표',
    description: value.description ?? null,
    status: value.status || 'active',
    priority: value.priority || 0,
    targetDate: value.targetDate ?? null,
    metadata: value.metadata || {},
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
    milestones: value.milestones || [],
  };
}

function normalizeGoals(values: unknown): MockGoalRecord[] {
  return Array.isArray(values) ? values.map((value) => normalizeGoal(value as Partial<MockGoalRecord>)) : [];
}

function keywordsFrom(goal: MockGoalRecord): string {
  const keywords = goal.metadata?.keywords;
  return Array.isArray(keywords) ? keywords.filter((value): value is string => typeof value === 'string').join(', ') : '';
}

export default function CareerGoalsPage() {
  const toast = useToast();
  const [goals, setGoals] = useState<MockGoalRecord[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalForm, setGoalForm] = useState<GoalForm>(newGoalForm);
  const [savingGoal, setSavingGoal] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [milestoneForm, setMilestoneForm] = useState<MilestoneForm>(newMilestoneForm);
  const [savingMilestone, setSavingMilestone] = useState(false);
  const [riasecScores, setRiasecScores] = useState<Record<string, number>>(() => Object.fromEntries(RIASEC_TYPES.map((item) => [item.code, 3])));
  const [riasecNote, setRiasecNote] = useState('');
  const [savingRiasec, setSavingRiasec] = useState(false);
  const [mandala, setMandala] = useState<string[][]>(blankMandala);
  const [savingMandala, setSavingMandala] = useState(false);

  const selectedGoal = useMemo(() => goals.find((goal) => goal.id === selectedGoalId) || null, [goals, selectedGoalId]);

  async function loadGoals() {
    setLoading(true);
    setLoadError(false);
    try {
      let next: MockGoalRecord[];
      if (isCareerMockMode()) {
        next = normalizeGoals(readMockList<MockGoalRecord>('mock_career_goals'));
      } else {
        const response = await fetch('/api/career-goals');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        next = normalizeGoals(await response.json());
      }
      setGoals(next);
      setSelectedGoalId((current) => current && next.some((goal) => goal.id === current) ? current : next[0]?.id || null);
    } catch {
      setLoadError(true);
      toast.add({ title: '진로 목표를 불러오지 못했습니다.', description: '잠시 후 다시 시도해주세요.', color: 'red' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals();
  }, []);

  useEffect(() => {
    if (!selectedGoal) return;
    const riasec = selectedGoal.metadata?.riasec as { questions?: Array<{ code?: string; score?: number; answer?: string }>; result?: { note?: string } } | undefined;
    const nextScores = Object.fromEntries(RIASEC_TYPES.map((item) => [item.code, riasec?.questions?.find((question) => question.code === item.code)?.score || 3]));
    setRiasecScores(nextScores);
    setRiasecNote(riasec?.result?.note || '');
    const storedMandala = selectedGoal.metadata?.mandalart as { cells?: unknown } | undefined;
    const cells = Array.isArray(storedMandala?.cells) && storedMandala.cells.length === 9 && storedMandala.cells.every((row) => Array.isArray(row) && row.length === 9)
      ? (storedMandala.cells as unknown[][]).map((row) => row.map((cell) => typeof cell === 'string' ? cell : ''))
      : blankMandala();
    if (!cells[4][4]) cells[4][4] = selectedGoal.title;
    setMandala(cells);
  }, [selectedGoal]);

  function openGoalCreate() {
    setEditingGoalId(null);
    setGoalForm(newGoalForm());
    setShowGoalForm(true);
  }

  function openGoalEdit(goal: MockGoalRecord) {
    setEditingGoalId(goal.id);
    setGoalForm({
      title: goal.title,
      description: goal.description || '',
      targetDate: dateInput(goal.targetDate),
      priority: String(goal.priority),
      keywords: keywordsFrom(goal),
    });
    setShowGoalForm(true);
  }

  async function saveGoal() {
    if (!goalForm.title.trim()) {
      toast.add({ title: '목표 제목을 입력해주세요.', color: 'red' });
      return;
    }
    setSavingGoal(true);
    const payload = {
      title: goalForm.title.trim(),
      description: goalForm.description.trim() || null,
      targetDate: goalForm.targetDate || null,
      priority: Number(goalForm.priority) || 0,
      keywords: goalForm.keywords.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean),
    };
    try {
      if (isCareerMockMode()) {
        const current = normalizeGoals(readMockList<MockGoalRecord>('mock_career_goals'));
        const now = new Date().toISOString();
        if (editingGoalId) {
          const next = current.map((goal) => goal.id === editingGoalId ? {
            ...goal,
            ...payload,
            description: payload.description,
            targetDate: payload.targetDate ? new Date(`${payload.targetDate}T12:00:00`).toISOString() : null,
            metadata: { ...goal.metadata, keywords: payload.keywords },
            updatedAt: now,
          } : goal);
          writeMockList('mock_career_goals', next);
        } else {
          const goal = normalizeGoal({
            ...payload,
            id: mockId('goal'),
            metadata: { keywords: payload.keywords },
            targetDate: payload.targetDate ? new Date(`${payload.targetDate}T12:00:00`).toISOString() : null,
            createdAt: now,
            updatedAt: now,
            milestones: [],
          });
          writeMockList('mock_career_goals', [goal, ...current]);
          setSelectedGoalId(goal.id);
        }
      } else {
        const response = await fetch(editingGoalId ? `/api/career-goals/${editingGoalId}` : '/api/career-goals', {
          method: editingGoalId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(data?.error || `HTTP ${response.status}`);
        }
        if (!editingGoalId) {
          const created = normalizeGoal(await response.json());
          setSelectedGoalId(created.id);
        }
      }
      setShowGoalForm(false);
      await loadGoals();
      toast.add({ title: editingGoalId ? '목표를 수정했습니다.' : '목표를 추가했습니다.', color: 'green' });
    } catch (error: unknown) {
      toast.add({ title: '목표를 저장하지 못했습니다.', description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.', color: 'red' });
    } finally {
      setSavingGoal(false);
    }
  }

  async function toggleGoal(goal: MockGoalRecord) {
    const completed = goal.status !== 'completed';
    try {
      if (isCareerMockMode()) {
        writeMockList('mock_career_goals', normalizeGoals(readMockList<MockGoalRecord>('mock_career_goals')).map((item) => item.id === goal.id ? { ...item, status: completed ? 'completed' : 'active', updatedAt: new Date().toISOString() } : item));
      } else {
        const response = await fetch(`/api/career-goals/${goal.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed }) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }
      await loadGoals();
    } catch (error: unknown) {
      toast.add({ title: '목표 상태를 바꾸지 못했습니다.', description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.', color: 'red' });
    }
  }

  async function deleteGoal(goal: MockGoalRecord) {
    if (!window.confirm(`'${goal.title}' 목표를 삭제할까요?`)) return;
    try {
      if (isCareerMockMode()) {
        writeMockList('mock_career_goals', normalizeGoals(readMockList<MockGoalRecord>('mock_career_goals')).filter((item) => item.id !== goal.id));
      } else {
        const response = await fetch(`/api/career-goals/${goal.id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }
      await loadGoals();
      toast.add({ title: '목표를 삭제했습니다.', color: 'green' });
    } catch (error: unknown) {
      toast.add({ title: '목표를 삭제하지 못했습니다.', description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.', color: 'red' });
    }
  }

  function openMilestoneCreate() {
    setEditingMilestoneId(null);
    setMilestoneForm(newMilestoneForm());
    setShowMilestoneForm(true);
  }

  function openMilestoneEdit(milestone: MockMilestoneRecord) {
    setEditingMilestoneId(milestone.id);
    setMilestoneForm({ title: milestone.title, description: milestone.description || '', dueDate: dateInput(milestone.dueDate) });
    setShowMilestoneForm(true);
  }

  async function saveMilestone() {
    if (!selectedGoal || !milestoneForm.title.trim()) {
      toast.add({ title: '마일스톤 제목을 입력해주세요.', color: 'red' });
      return;
    }
    setSavingMilestone(true);
    const payload = { title: milestoneForm.title.trim(), description: milestoneForm.description.trim() || null, dueDate: milestoneForm.dueDate || null };
    try {
      if (isCareerMockMode()) {
        const current = normalizeGoals(readMockList<MockGoalRecord>('mock_career_goals'));
        const now = new Date().toISOString();
        const next = current.map((goal) => {
          if (goal.id !== selectedGoal.id) return goal;
          if (editingMilestoneId) {
            return { ...goal, milestones: goal.milestones.map((item) => item.id === editingMilestoneId ? { ...item, ...payload, dueDate: payload.dueDate ? new Date(`${payload.dueDate}T12:00:00`).toISOString() : null, updatedAt: now } : item), updatedAt: now };
          }
          return { ...goal, milestones: [...goal.milestones, { id: mockId('milestone'), goalId: goal.id, userId: mockUserId(), ...payload, dueDate: payload.dueDate ? new Date(`${payload.dueDate}T12:00:00`).toISOString() : null, status: 'pending', sortOrder: goal.milestones.length, completedAt: null, createdAt: now, updatedAt: now }], updatedAt: now };
        });
        writeMockList('mock_career_goals', next);
      } else {
        const url = editingMilestoneId ? `/api/career-goals/${selectedGoal.id}/milestones/${editingMilestoneId}` : `/api/career-goals/${selectedGoal.id}/milestones`;
        const response = await fetch(url, { method: editingMilestoneId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
          const data = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(data?.error || `HTTP ${response.status}`);
        }
      }
      setShowMilestoneForm(false);
      await loadGoals();
      toast.add({ title: editingMilestoneId ? '마일스톤을 수정했습니다.' : '마일스톤을 추가했습니다.', color: 'green' });
    } catch (error: unknown) {
      toast.add({ title: '마일스톤을 저장하지 못했습니다.', description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.', color: 'red' });
    } finally {
      setSavingMilestone(false);
    }
  }

  async function toggleMilestone(milestone: MockMilestoneRecord) {
    if (!selectedGoal) return;
    const completed = milestone.status !== 'completed';
    try {
      if (isCareerMockMode()) {
        const next = normalizeGoals(readMockList<MockGoalRecord>('mock_career_goals')).map((goal) => goal.id === selectedGoal.id ? { ...goal, milestones: goal.milestones.map((item) => item.id === milestone.id ? { ...item, status: completed ? 'completed' : 'pending', completedAt: completed ? new Date().toISOString() : null, updatedAt: new Date().toISOString() } : item) } : goal);
        writeMockList('mock_career_goals', next);
      } else {
        const response = await fetch(`/api/career-goals/${selectedGoal.id}/milestones/${milestone.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed }) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }
      await loadGoals();
    } catch (error: unknown) {
      toast.add({ title: '마일스톤 상태를 바꾸지 못했습니다.', description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.', color: 'red' });
    }
  }

  async function deleteMilestone(milestone: MockMilestoneRecord) {
    if (!selectedGoal || !window.confirm(`'${milestone.title}' 마일스톤을 삭제할까요?`)) return;
    try {
      if (isCareerMockMode()) {
        writeMockList('mock_career_goals', normalizeGoals(readMockList<MockGoalRecord>('mock_career_goals')).map((goal) => goal.id === selectedGoal.id ? { ...goal, milestones: goal.milestones.filter((item) => item.id !== milestone.id) } : goal));
      } else {
        const response = await fetch(`/api/career-goals/${selectedGoal.id}/milestones/${milestone.id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }
      await loadGoals();
    } catch (error: unknown) {
      toast.add({ title: '마일스톤을 삭제하지 못했습니다.', description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.', color: 'red' });
    }
  }

  async function saveGoalMetadata(key: 'riasec' | 'mandalart', value: Record<string, unknown>, successTitle: string) {
    if (!selectedGoal) return;
    try {
      if (isCareerMockMode()) {
        const next = normalizeGoals(readMockList<MockGoalRecord>('mock_career_goals')).map((goal) => goal.id === selectedGoal.id ? { ...goal, metadata: { ...goal.metadata, [key]: value }, updatedAt: new Date().toISOString() } : goal);
        writeMockList('mock_career_goals', next);
      } else {
        const response = await fetch(`/api/career-goals/${selectedGoal.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metadata: { ...selectedGoal.metadata, [key]: value } }) });
        if (!response.ok) {
          const data = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(data?.error || `HTTP ${response.status}`);
        }
      }
      await loadGoals();
      toast.add({ title: successTitle, color: 'green' });
    } catch (error: unknown) {
      toast.add({ title: '탐색 데이터를 저장하지 못했습니다.', description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.', color: 'red' });
    }
  }

  async function saveRiasec() {
    if (!selectedGoal) return;
    setSavingRiasec(true);
    const scores = Object.fromEntries(RIASEC_TYPES.map((item) => [item.code, (riasecScores[item.code] || 3) * 20]));
    const order = RIASEC_TYPES.slice().sort((a, b) => (scores[b.code] || 0) - (scores[a.code] || 0)).map((item) => item.code);
    await saveGoalMetadata('riasec', {
      mode: 'exploration',
      questions: RIASEC_TYPES.map((item) => ({ code: item.code, prompt: item.prompt, score: riasecScores[item.code] || 3 })),
      result: { scores, order, note: riasecNote.trim() },
      savedAt: new Date().toISOString(),
    }, 'RIASEC 자기성찰을 저장했습니다.');
    setSavingRiasec(false);
  }

  async function saveMandala() {
    if (!selectedGoal) return;
    setSavingMandala(true);
    await saveGoalMetadata('mandalart', { mode: 'goal-action-plan', cells: mandala, centerGoal: mandala[4][4], savedAt: new Date().toISOString() }, '만다라트 행동 계획을 저장했습니다.');
    setSavingMandala(false);
  }

  const explorationOrder = RIASEC_TYPES
    .slice()
    .sort((a, b) => (riasecScores[b.code] || 0) - (riasecScores[a.code] || 0))
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/career" className="text-xs font-semibold text-blue-600 hover:text-blue-700">경력 관리로 돌아가기</Link>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">Career Direction</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">목표와 마일스톤</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">목표를 작은 행동으로 나누고, 자기성찰과 계획을 한 곳에 저장하세요. 결과는 탐색을 돕는 기록일 뿐 진단이 아닙니다.</p>
        </div>
        <button type="button" onClick={openGoalCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-700"><span aria-hidden="true" className="text-lg leading-none">+</span>목표 추가</button>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="커리어 계획 메뉴">
        <Link href="/career/diary" className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:border-blue-200 hover:text-blue-600">경력 일기</Link>
        <Link href="/career/goals" className="rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white">목표와 마일스톤</Link>
        <Link href="/career/matches" className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:border-blue-200 hover:text-blue-600">후보 직무 추천</Link>
      </nav>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.5fr)]"><div className="h-80 animate-pulse rounded-2xl bg-white" /><div className="h-80 animate-pulse rounded-2xl bg-white" /></div>
      ) : loadError ? (
        <div className="rounded-2xl border border-red-200 bg-white p-10 text-center"><p className="text-sm font-semibold text-gray-800">목표를 불러오지 못했습니다.</p><button type="button" onClick={loadGoals} className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">다시 시도</button></div>
      ) : goals.length === 0 ? (
        <EmptyState icon="목표" title="아직 목표가 없습니다" description="이번 분기에 집중할 목표 하나를 만들고 첫 마일스톤을 정해보세요." actionLabel="첫 목표 만들기" onAction={openGoalCreate} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.5fr)]">
          <section className="space-y-3" aria-label="목표 목록">
            <div className="flex items-center justify-between"><h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">내 목표</h2><span className="text-xs text-gray-400">{goals.length}개</span></div>
            {goals.map((goal) => {
              const selected = goal.id === selectedGoalId;
              const completedCount = goal.milestones.filter((item) => item.status === 'completed').length;
              return (
                <button type="button" key={goal.id} onClick={() => setSelectedGoalId(goal.id)} className={`w-full rounded-2xl border p-5 text-left transition ${selected ? 'border-violet-300 bg-violet-50/70 shadow-sm' : 'border-gray-100 bg-white hover:border-violet-200 hover:shadow-card'}`}>
                  <div className="flex items-start justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${goal.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-violet-600'}`}>{goal.status === 'completed' ? '완료' : `우선순위 ${goal.priority}`}</span><span className="text-xs text-gray-400">{completedCount}/{goal.milestones.length}</span></div>
                  <h3 className="mt-3 break-words text-base font-bold text-gray-900">{goal.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{goal.description || '설명 없음'}</p>
                  {goal.targetDate && <p className="mt-3 text-xs font-medium text-gray-400">목표일 {formatDate(goal.targetDate)}</p>}
                </button>
              );
            })}
          </section>

          {selectedGoal && (
            <section className="space-y-6" aria-label="선택한 목표">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs md:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selectedGoal.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600'}`}>{selectedGoal.status === 'completed' ? '완료된 목표' : '진행 중인 목표'}</span><h2 className="mt-3 break-words text-2xl font-bold text-gray-900">{selectedGoal.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{selectedGoal.description || '목표 설명을 추가해보세요.'}</p></div>
                  <div className="flex shrink-0 gap-2"><button type="button" onClick={() => toggleGoal(selectedGoal)} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50">{selectedGoal.status === 'completed' ? '완료 취소' : '완료 처리'}</button><button type="button" onClick={() => openGoalEdit(selectedGoal)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-blue-200 hover:text-blue-600">수정</button><button type="button" onClick={() => deleteGoal(selectedGoal)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50">삭제</button></div>
                </div>
                <div className="mt-6 flex flex-wrap gap-4 border-t border-gray-100 pt-5 text-xs text-gray-500"><span>목표일 {selectedGoal.targetDate ? formatDate(selectedGoal.targetDate) : '미정'}</span><span>마일스톤 {selectedGoal.milestones.filter((item) => item.status === 'completed').length}/{selectedGoal.milestones.length} 완료</span></div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs md:p-7">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-500">Action Steps</p><h2 className="mt-1 text-lg font-bold text-gray-900">마일스톤</h2></div><button type="button" onClick={openMilestoneCreate} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">마일스톤 추가</button></div>
                <div className="mt-5 space-y-3">
                  {selectedGoal.milestones.length === 0 ? <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">목표를 행동 단위로 나눠보세요.</p> : selectedGoal.milestones.map((milestone) => <div key={milestone.id} className="flex items-start gap-3 rounded-xl border border-gray-100 p-4"><button type="button" onClick={() => toggleMilestone(milestone)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${milestone.status === 'completed' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 text-transparent hover:border-blue-400'}`} aria-label={milestone.status === 'completed' ? '완료 취소' : '완료 처리'}>✓</button><div className="min-w-0 flex-1"><p className={`break-words text-sm font-semibold ${milestone.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{milestone.title}</p>{milestone.description && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-gray-500">{milestone.description}</p>}{milestone.dueDate && <p className="mt-2 text-[11px] text-gray-400">기한 {formatDate(milestone.dueDate)}</p>}</div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => openMilestoneEdit(milestone)} className="rounded px-2 py-1 text-[11px] font-semibold text-gray-400 hover:bg-gray-100 hover:text-blue-600">수정</button><button type="button" onClick={() => deleteMilestone(milestone)} className="rounded px-2 py-1 text-[11px] font-semibold text-gray-400 hover:bg-red-50 hover:text-red-500">삭제</button></div></div>)}
                </div>
              </div>

              <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6 md:p-7" aria-labelledby="riasec-title">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Exploration Notes</p><h2 id="riasec-title" className="mt-1 text-lg font-bold text-gray-900">RIASEC 자기성찰</h2></div><span className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-amber-700">진단 아님</span></div>
                <p className="mt-3 text-sm leading-6 text-gray-600">각 문항을 최근 경험을 돌아보는 질문으로 사용하세요. 점수는 성향을 판정하지 않고, 다음 대화와 탐색을 위한 메모로 저장됩니다.</p>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {RIASEC_TYPES.map((item) => <label key={item.code} className="rounded-xl border border-amber-100 bg-white p-4"><span className="flex items-center justify-between gap-2"><span className="text-sm font-bold text-gray-900"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs text-amber-700">{item.code}</span>{item.label}</span><span className="text-xs font-semibold text-amber-700">{riasecScores[item.code] || 3}/5</span></span><span className="mt-3 block text-xs leading-5 text-gray-600">{item.prompt}</span><input type="range" min="1" max="5" step="1" value={riasecScores[item.code] || 3} onChange={(event) => setRiasecScores({ ...riasecScores, [item.code]: Number(event.target.value) })} className="mt-4 w-full accent-amber-600" aria-label={`${item.label} 자기성찰 점수`} /></label>)}
                </div>
                <div className="mt-4 rounded-xl border border-amber-100 bg-white p-4"><p className="text-xs font-semibold text-amber-700">현재 탐색 요약</p><p className="mt-2 text-sm font-semibold text-gray-800">{explorationOrder.map((item) => `${item.label} ${riasecScores[item.code] || 3}/5`).join(' · ')}</p><p className="mt-1 text-xs leading-5 text-gray-500">높은 순서는 진단 결과가 아니라, 다음 회고에서 더 물어볼 주제를 정하는 참고 순서입니다.</p></div>
                <label className="mt-4 block text-sm font-semibold text-gray-700">탐색 메모<textarea rows={3} value={riasecNote} onChange={(event) => setRiasecNote(event.target.value)} placeholder="점수보다 기억에 남은 상황과 에너지가 생긴 이유를 적어보세요." className="mt-2 w-full resize-y rounded-xl border border-amber-100 bg-white px-3.5 py-3 text-sm font-normal leading-6 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100" /></label>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-amber-800">저장된 결과는 유형 진단이나 적성 판정으로 사용하지 않습니다.</p><button type="button" onClick={saveRiasec} disabled={savingRiasec} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50">{savingRiasec && <Spinner className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}{savingRiasec ? '저장 중' : '성찰 저장'}</button></div>
              </section>

              <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-6 md:p-7" aria-labelledby="mandala-title">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Goal to Actions</p><h2 id="mandala-title" className="mt-1 text-lg font-bold text-gray-900">만다라트 9x9</h2></div><span className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-indigo-700">목표·행동 계획</span></div>
                <p className="mt-3 text-sm leading-6 text-gray-600">가운데 목표에서 시작해 주변에 필요한 영역과 행동을 채워보세요. 빈 칸을 남겨도 괜찮으며, 계획 저장은 달성을 보장하지 않습니다.</p>
                <div className="mt-5 overflow-x-auto rounded-xl border border-indigo-100 bg-white p-3"><div className="grid min-w-[720px] grid-cols-9 gap-1.5">{mandala.map((row, rowIndex) => row.map((cell, columnIndex) => <input key={`${rowIndex}-${columnIndex}`} value={cell} onChange={(event) => setMandala((current) => current.map((currentRow, currentRowIndex) => currentRowIndex === rowIndex ? currentRow.map((currentCell, currentColumnIndex) => currentColumnIndex === columnIndex ? event.target.value : currentCell) : currentRow))} aria-label={`만다라트 ${rowIndex + 1}행 ${columnIndex + 1}열`} placeholder={rowIndex === 4 && columnIndex === 4 ? '핵심 목표' : ''} className={`h-16 min-w-0 rounded-lg border px-1.5 text-center text-[11px] leading-4 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${rowIndex === 4 && columnIndex === 4 ? 'border-indigo-400 bg-indigo-50 font-bold text-indigo-800' : 'border-gray-200 text-gray-700'}`} />))}</div></div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-indigo-800">9행 9열 계획 데이터는 선택한 목표의 개인 기록으로 저장됩니다.</p><button type="button" onClick={saveMandala} disabled={savingMandala} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{savingMandala && <Spinner className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}{savingMandala ? '저장 중' : '계획 저장'}</button></div>
              </section>
            </section>
          )}
        </div>
      )}

      {showGoalForm && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowGoalForm(false)}><div className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-lift md:p-8" role="dialog" aria-modal="true" aria-labelledby="goal-form-title"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-violet-500">Career Direction</p><h2 id="goal-form-title" className="mt-1 text-xl font-bold text-gray-900">{editingGoalId ? '목표 수정' : '새 목표'}</h2></div><button type="button" onClick={() => setShowGoalForm(false)} className="rounded-lg px-2 py-1 text-xl leading-none text-gray-400 hover:bg-gray-100" aria-label="닫기">×</button></div><div className="mt-6 space-y-5"><label className="block text-sm font-semibold text-gray-700">목표 제목 <span className="text-red-500">*</span><input type="text" maxLength={255} value={goalForm.title} onChange={(event) => setGoalForm({ ...goalForm, title: event.target.value })} placeholder="예: 제품 분석 역량을 키우기" className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm font-normal focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100" /></label><label className="block text-sm font-semibold text-gray-700">설명<textarea rows={4} value={goalForm.description} onChange={(event) => setGoalForm({ ...goalForm, description: event.target.value })} placeholder="이 목표가 중요한 이유와 기대하는 변화를 적어보세요." className="mt-2 w-full resize-y rounded-xl border border-gray-200 px-3.5 py-3 text-sm font-normal leading-6 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-gray-700">목표일<input type="date" value={goalForm.targetDate} onChange={(event) => setGoalForm({ ...goalForm, targetDate: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm font-normal focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100" /></label><label className="text-sm font-semibold text-gray-700">우선순위<select value={goalForm.priority} onChange={(event) => setGoalForm({ ...goalForm, priority: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-normal focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100">{[0, 1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value === 0 ? '미지정' : value}</option>)}</select></label></div><label className="block text-sm font-semibold text-gray-700">목표 키워드<input type="text" value={goalForm.keywords} onChange={(event) => setGoalForm({ ...goalForm, keywords: event.target.value })} placeholder="예: 분석, 리서치, SQL" className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm font-normal focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100" /><span className="mt-1 block text-xs font-normal text-gray-400">쉼표로 구분하면 후보 직무 탐색에 참고됩니다.</span></label></div><div className="mt-7 flex gap-3"><button type="button" onClick={() => setShowGoalForm(false)} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">취소</button><button type="button" onClick={saveGoal} disabled={savingGoal || !goalForm.title.trim()} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50">{savingGoal && <Spinner className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}{savingGoal ? '저장 중' : '저장'}</button></div></div></div>}

      {showMilestoneForm && selectedGoal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowMilestoneForm(false)}><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lift" role="dialog" aria-modal="true" aria-labelledby="milestone-form-title"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-500">Action Step</p><h2 id="milestone-form-title" className="mt-1 text-xl font-bold text-gray-900">{editingMilestoneId ? '마일스톤 수정' : '마일스톤 추가'}</h2></div><button type="button" onClick={() => setShowMilestoneForm(false)} className="rounded-lg px-2 py-1 text-xl leading-none text-gray-400 hover:bg-gray-100" aria-label="닫기">×</button></div><div className="mt-6 space-y-5"><label className="block text-sm font-semibold text-gray-700">제목 <span className="text-red-500">*</span><input type="text" maxLength={255} value={milestoneForm.title} onChange={(event) => setMilestoneForm({ ...milestoneForm, title: event.target.value })} placeholder="예: 관련 사례 3개 분석하기" className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm font-normal focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" /></label><label className="block text-sm font-semibold text-gray-700">설명<textarea rows={3} value={milestoneForm.description} onChange={(event) => setMilestoneForm({ ...milestoneForm, description: event.target.value })} placeholder="완료 기준을 구체적으로 적어보세요." className="mt-2 w-full resize-y rounded-xl border border-gray-200 px-3.5 py-3 text-sm font-normal leading-6 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" /></label><label className="block text-sm font-semibold text-gray-700">기한<input type="date" value={milestoneForm.dueDate} onChange={(event) => setMilestoneForm({ ...milestoneForm, dueDate: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm font-normal focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" /></label></div><div className="mt-7 flex gap-3"><button type="button" onClick={() => setShowMilestoneForm(false)} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">취소</button><button type="button" onClick={saveMilestone} disabled={savingMilestone || !milestoneForm.title.trim()} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50">{savingMilestone && <Spinner className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}{savingMilestone ? '저장 중' : '저장'}</button></div></div></div>}
    </div>
  );
}
