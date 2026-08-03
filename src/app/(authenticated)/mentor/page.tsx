'use client';

import { FormEvent, useEffect, useState } from 'react';

interface Roadmap {
  id: string;
  title: string;
  objective?: string | null;
  status: string;
  source?: string;
  targetDate?: string | null;
  createdAt?: string;
}

interface Task {
  id: string;
  roadmapId: string;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'completed' | string;
  dueDate?: string | null;
  completedAt?: string | null;
}

interface Metrics {
  totalTaskCount: number;
  completedTaskCount: number;
  completionRate: number;
  streakDays: number;
}

interface GrowthEvent {
  id: string;
  title: string;
  eventType: string;
  occurredAt?: string;
}

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error || `${fallback} (${response.status})`;
}

function formatDate(value?: string | null) {
  if (!value) return '날짜 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '날짜 없음';
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusLabel(status: string) {
  if (status === 'completed') return '완료';
  if (status === 'in_progress') return '진행 중';
  return '할 일';
}

export default function MentorPage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<GrowthEvent[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalTaskCount: 0,
    completedTaskCount: 0,
    completionRate: 0,
    streakDays: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [savingRoadmap, setSavingRoadmap] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roadmapTitle, setRoadmapTitle] = useState('');
  const [roadmapObjective, setRoadmapObjective] = useState('');
  const [taskTitle, setTaskTitle] = useState('');

  async function loadMetricsAndEvents() {
    const [metricsResponse, eventsResponse] = await Promise.all([
      fetch('/api/growth-events/metrics'),
      fetch('/api/growth-events'),
    ]);
    if (metricsResponse.ok) setMetrics(await metricsResponse.json() as Metrics);
    if (eventsResponse.ok) setEvents((await eventsResponse.json()) as GrowthEvent[]);
  }

  async function loadTasks(roadmapId: string) {
    setLoadingTasks(true);
    try {
      const response = await fetch(`/api/mentor-tasks?roadmapId=${encodeURIComponent(roadmapId)}`);
      if (!response.ok) throw new Error(await responseError(response, '과제를 불러오지 못했습니다.'));
      setTasks((await response.json()) as Task[]);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : '과제를 불러오지 못했습니다.');
    } finally {
      setLoadingTasks(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      setLoading(true);
      try {
        const [roadmapsResponse, metricsResponse, eventsResponse] = await Promise.all([
          fetch('/api/mentor-roadmaps'),
          fetch('/api/growth-events/metrics'),
          fetch('/api/growth-events'),
        ]);
        if (!roadmapsResponse.ok) throw new Error(await responseError(roadmapsResponse, '로드맵을 불러오지 못했습니다.'));
        const nextRoadmaps = (await roadmapsResponse.json()) as Roadmap[];
        if (!active) return;
        setRoadmaps(nextRoadmaps);
        setSelectedRoadmapId(nextRoadmaps[0]?.id || null);
        if (metricsResponse.ok) setMetrics(await metricsResponse.json() as Metrics);
        if (eventsResponse.ok) setEvents((await eventsResponse.json()) as GrowthEvent[]);
      } catch (loadError: unknown) {
        if (active) setError(loadError instanceof Error ? loadError.message : '멘토 데이터를 불러오지 못했습니다.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedRoadmapId) void loadTasks(selectedRoadmapId);
    else setTasks([]);
  }, [selectedRoadmapId]);

  async function createTemplate() {
    setCreatingTemplate(true);
    setError(null);
    try {
      const response = await fetch('/api/mentor-roadmaps/template', { method: 'POST' });
      if (!response.ok) throw new Error(await responseError(response, '템플릿을 생성하지 못했습니다.'));
      const data = await response.json() as { roadmap: Roadmap; tasks: Task[] };
      setRoadmaps((current) => [data.roadmap, ...current]);
      setSelectedRoadmapId(data.roadmap.id);
      setTasks(data.tasks);
      await loadMetricsAndEvents();
    } catch (createError: unknown) {
      setError(createError instanceof Error ? createError.message : '템플릿을 생성하지 못했습니다.');
    } finally {
      setCreatingTemplate(false);
    }
  }

  async function createRoadmap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roadmapTitle.trim()) return;
    setSavingRoadmap(true);
    setError(null);
    try {
      const response = await fetch('/api/mentor-roadmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: roadmapTitle.trim(),
          ...(roadmapObjective.trim() ? { objective: roadmapObjective.trim() } : {}),
        }),
      });
      if (!response.ok) throw new Error(await responseError(response, '로드맵을 저장하지 못했습니다.'));
      const roadmap = await response.json() as Roadmap;
      setRoadmaps((current) => [roadmap, ...current]);
      setSelectedRoadmapId(roadmap.id);
      setRoadmapTitle('');
      setRoadmapObjective('');
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : '로드맵을 저장하지 못했습니다.');
    } finally {
      setSavingRoadmap(false);
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRoadmapId || !taskTitle.trim()) return;
    setSavingTask(true);
    setError(null);
    try {
      const response = await fetch('/api/mentor-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roadmapId: selectedRoadmapId, title: taskTitle.trim() }),
      });
      if (!response.ok) throw new Error(await responseError(response, '과제를 저장하지 못했습니다.'));
      const data = await response.json() as { task: Task };
      setTasks((current) => [...current, data.task]);
      setTaskTitle('');
      await loadMetricsAndEvents();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : '과제를 저장하지 못했습니다.');
    } finally {
      setSavingTask(false);
    }
  }

  async function toggleTask(task: Task) {
    setBusyTaskId(task.id);
    setError(null);
    try {
      const response = task.status === 'completed'
        ? await fetch(`/api/mentor-tasks/${task.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'todo' }),
          })
        : await fetch(`/api/mentor-tasks/${task.id}/complete`, { method: 'POST' });
      if (!response.ok) throw new Error(await responseError(response, '과제 상태를 저장하지 못했습니다.'));
      const data = await response.json() as { task: Task };
      setTasks((current) => current.map((item) => item.id === task.id ? data.task : item));
      await loadMetricsAndEvents();
    } catch (toggleError: unknown) {
      setError(toggleError instanceof Error ? toggleError.message : '과제 상태를 저장하지 못했습니다.');
    } finally {
      setBusyTaskId(null);
    }
  }

  async function deleteTask(taskId: string) {
    if (!window.confirm('이 과제를 삭제하시겠습니까?')) return;
    setBusyTaskId(taskId);
    try {
      const response = await fetch(`/api/mentor-tasks/${taskId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await responseError(response, '과제를 삭제하지 못했습니다.'));
      setTasks((current) => current.filter((task) => task.id !== taskId));
      await loadMetricsAndEvents();
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : '과제를 삭제하지 못했습니다.');
    } finally {
      setBusyTaskId(null);
    }
  }

  async function deleteRoadmap(roadmapId: string) {
    if (!window.confirm('이 로드맵과 과제를 모두 삭제하시겠습니까?')) return;
    setError(null);
    try {
      const response = await fetch(`/api/mentor-roadmaps/${roadmapId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await responseError(response, '로드맵을 삭제하지 못했습니다.'));
      const nextRoadmaps = roadmaps.filter((roadmap) => roadmap.id !== roadmapId);
      setRoadmaps(nextRoadmaps);
      setSelectedRoadmapId(nextRoadmaps[0]?.id || null);
      await loadMetricsAndEvents();
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : '로드맵을 삭제하지 못했습니다.');
    }
  }

  const selectedRoadmap = roadmaps.find((roadmap) => roadmap.id === selectedRoadmapId);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Mentor Workspace</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">취업 준비 로드맵</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            준비할 일을 작게 나누고, 완료한 기록을 개인 성장 흐름으로 확인하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void createTemplate()}
          disabled={creatingTemplate}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creatingTemplate ? '템플릿 생성 중' : '3개월 템플릿 만들기'}
        </button>
      </header>

      {error && (
        <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="self-start font-semibold hover:underline sm:self-auto">닫기</button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="개인 성장 지표">
        {[
          { label: '완료율', value: `${metrics.completionRate}%`, detail: `${metrics.completedTaskCount}/${metrics.totalTaskCount} 과제` },
          { label: '현재 연속일', value: `${metrics.streakDays}일`, detail: '완료 기록 기준' },
          { label: '완료 과제', value: `${metrics.completedTaskCount}`, detail: '전체 로드맵 기준' },
          { label: '진행 로드맵', value: `${roadmaps.filter((roadmap) => roadmap.status === 'active').length}`, detail: '내가 만든 로드맵' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{stat.value}</p>
            <p className="mt-1 text-xs text-gray-400">{stat.detail}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-gray-800">내 로드맵</h2>
              <span className="text-xs text-gray-400">{roadmaps.length}개</span>
            </div>
            <div className="mt-3 space-y-2">
              {loading ? (
                <div className="space-y-2"><div className="skeleton h-12 rounded-xl" /><div className="skeleton h-12 rounded-xl" /></div>
              ) : roadmaps.length === 0 ? (
                <p className="rounded-xl bg-gray-50 px-3 py-5 text-center text-xs leading-5 text-gray-500">아직 로드맵이 없습니다.<br />템플릿 또는 직접 만들기로 시작하세요.</p>
              ) : (
                roadmaps.map((roadmap) => (
                  <div key={roadmap.id} className={`rounded-xl border transition-colors ${selectedRoadmapId === roadmap.id ? 'border-blue-200 bg-blue-50/60' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                    <button type="button" onClick={() => setSelectedRoadmapId(roadmap.id)} className="w-full px-3 py-3 text-left">
                      <span className={`block truncate text-sm font-semibold ${selectedRoadmapId === roadmap.id ? 'text-blue-700' : 'text-gray-700'}`}>{roadmap.title}</span>
                      <span className="mt-1 block text-[11px] text-gray-400">목표일 {formatDate(roadmap.targetDate)}</span>
                    </button>
                    <button type="button" onClick={() => void deleteRoadmap(roadmap.id)} className="px-3 pb-2 text-[11px] font-semibold text-gray-400 hover:text-red-600">삭제</button>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={createRoadmap} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-800">직접 로드맵 저장</h2>
            <label className="mt-3 block text-xs font-semibold text-gray-500" htmlFor="roadmap-title">제목</label>
            <input id="roadmap-title" value={roadmapTitle} onChange={(event) => setRoadmapTitle(event.target.value)} placeholder="예: 상반기 개발자 준비" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <label className="mt-3 block text-xs font-semibold text-gray-500" htmlFor="roadmap-objective">목표 설명</label>
            <textarea id="roadmap-objective" value={roadmapObjective} onChange={(event) => setRoadmapObjective(event.target.value)} rows={3} placeholder="이번 준비에서 이루고 싶은 목표" className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <button type="submit" disabled={savingRoadmap || !roadmapTitle.trim()} className="mt-3 w-full rounded-xl bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40">{savingRoadmap ? '저장 중' : '로드맵 저장'}</button>
          </form>
        </aside>

        <section className="min-w-0 rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
            {selectedRoadmap ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">Personal plan</p>
                    <h2 className="mt-1 text-xl font-bold text-gray-900">{selectedRoadmap.title}</h2>
                  </div>
                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">{selectedRoadmap.status === 'active' ? '진행 중' : selectedRoadmap.status}</span>
                </div>
                {selectedRoadmap.objective && <p className="mt-3 text-sm leading-6 text-gray-500">{selectedRoadmap.objective}</p>}
              </>
            ) : (
              <div><p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Personal plan</p><h2 className="mt-1 text-xl font-bold text-gray-900">로드맵을 선택하세요</h2><p className="mt-2 text-sm text-gray-500">왼쪽에서 템플릿을 만들거나 새 로드맵을 저장하세요.</p></div>
            )}
          </div>

          {selectedRoadmap && (
            <>
              <form onSubmit={createTask} className="flex flex-col gap-2 border-b border-gray-100 bg-gray-50/70 p-4 sm:flex-row">
                <label htmlFor="task-title" className="sr-only">새 과제</label>
                <input id="task-title" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="오늘 할 일을 한 줄로 입력하세요" className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                <button type="submit" disabled={savingTask || !taskTitle.trim()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">{savingTask ? '저장 중' : '과제 저장'}</button>
              </form>
              <div className="p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-bold text-gray-800">과제 목록</h3><span className="text-xs text-gray-400">{tasks.length}개</span></div>
                {loadingTasks ? (
                  <div className="space-y-3"><div className="skeleton h-16 rounded-xl" /><div className="skeleton h-16 rounded-xl" /></div>
                ) : tasks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 px-4 py-12 text-center"><p className="text-sm font-semibold text-gray-600">아직 과제가 없습니다.</p><p className="mt-1 text-xs text-gray-400">위 입력창에서 첫 과제를 저장하세요.</p></div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div key={task.id} className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${task.status === 'completed' ? 'border-green-100 bg-green-50/50' : 'border-gray-100 bg-white'}`}>
                        <button type="button" onClick={() => void toggleTask(task)} disabled={busyTaskId === task.id} aria-label={`${task.title} ${task.status === 'completed' ? '미완료로 변경' : '완료 처리'}`} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold transition-colors ${task.status === 'completed' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 bg-white text-transparent hover:border-blue-400'}`}>{task.status === 'completed' ? '완료' : '미완료'}</button>
                        <div className="min-w-0 flex-1"><p className={`text-sm font-semibold ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.title}</p><p className="mt-1 text-xs text-gray-400">{statusLabel(task.status)} <span className="mx-1 text-gray-300">|</span> 마감 {formatDate(task.dueDate)}</p></div>
                        <button type="button" onClick={() => void deleteTask(task.id)} disabled={busyTaskId === task.id} className="shrink-0 px-1 text-xs font-semibold text-gray-400 hover:text-red-600 disabled:opacity-40">삭제</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <aside className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-bold text-gray-800">최근 완료 기록</h2><span className="text-xs text-gray-400">{events.length}개</span></div>
          <div className="mt-4 space-y-3">
            {events.length === 0 ? <p className="rounded-xl bg-gray-50 px-3 py-6 text-center text-xs leading-5 text-gray-500">과제를 완료하면<br />여기에 기록됩니다.</p> : events.slice(0, 8).map((event) => <div key={event.id} className="border-l-2 border-blue-200 pl-3"><p className="text-sm font-medium leading-5 text-gray-700">{event.title}</p><p className="mt-1 text-xs text-gray-400">{formatDate(event.occurredAt)}</p></div>)}
          </div>
          <p className="mt-6 border-t border-gray-100 pt-4 text-xs leading-5 text-gray-400">지표는 내 과제의 완료 기록만 계산합니다.</p>
        </aside>
      </div>
    </div>
  );
}
