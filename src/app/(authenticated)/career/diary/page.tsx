'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/lib/toast';
import EmptyState from '@/components/EmptyState';
import Spinner from '@/components/Spinner';
import {
  isCareerMockMode,
  mockId,
  mockTags,
  mockUserId,
  readMockList,
  writeMockList,
  type MockDiaryRecord,
} from './mockStore';

type DiaryForm = {
  occurredAt: string;
  title: string;
  content: string;
  tags: string;
  entryType: string;
};

const ENTRY_TYPES = [
  { value: 'reflection', label: '회고' },
  { value: 'achievement', label: '성과' },
  { value: 'challenge', label: '도전' },
  { value: 'learning', label: '학습' },
  { value: 'feedback', label: '피드백' },
  { value: 'riasec_reflection', label: '자기성찰' },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function blankForm(): DiaryForm {
  return { occurredAt: today(), title: '', content: '', tags: '', entryType: 'reflection' };
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function typeLabel(value: string): string {
  return ENTRY_TYPES.find((item) => item.value === value)?.label || value;
}

export default function CareerDiaryPage() {
  const toast = useToast();
  const [entries, setEntries] = useState<MockDiaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState<DiaryForm>(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadEntries() {
    setLoading(true);
    setLoadError(false);
    try {
      if (isCareerMockMode()) {
        setEntries(readMockList<MockDiaryRecord>('mock_career_diary'));
        return;
      }
      const response = await fetch('/api/career-diary');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setEntries(await response.json() as MockDiaryRecord[]);
    } catch {
      setLoadError(true);
      toast.add({ title: '경력 일기를 불러오지 못했습니다.', description: '잠시 후 다시 시도해주세요.', color: 'red' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(blankForm());
    setShowForm(true);
  }

  function openEdit(entry: MockDiaryRecord) {
    setEditingId(entry.id);
    setForm({
      occurredAt: entry.occurredAt.slice(0, 10),
      title: entry.title || '',
      content: entry.content,
      tags: entry.tags.join(', '),
      entryType: entry.entryType,
    });
    setShowForm(true);
  }

  async function saveEntry() {
    if (!form.content.trim()) {
      toast.add({ title: '내용을 입력해주세요.', color: 'red' });
      return;
    }
    setSaving(true);
    const occurredAt = new Date(`${form.occurredAt || today()}T12:00:00`).toISOString();
    const payload = {
      occurredAt,
      title: form.title.trim() || null,
      content: form.content.trim(),
      tags: mockTags(form.tags),
      entryType: form.entryType,
    };
    try {
      if (isCareerMockMode()) {
        const current = readMockList<MockDiaryRecord>('mock_career_diary');
        const now = new Date().toISOString();
        if (editingId) {
          const next = current.map((entry) => entry.id === editingId ? { ...entry, ...payload, updatedAt: now } : entry);
          writeMockList('mock_career_diary', next);
        } else {
          writeMockList('mock_career_diary', [{
            id: mockId('diary'),
            userId: mockUserId(),
            ...payload,
            createdAt: now,
            updatedAt: now,
          }, ...current]);
        }
      } else {
        const response = await fetch(editingId ? `/api/career-diary/${editingId}` : '/api/career-diary', {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(data?.error || `HTTP ${response.status}`);
        }
      }
      setShowForm(false);
      setEditingId(null);
      setForm(blankForm());
      await loadEntries();
      toast.add({ title: editingId ? '경력 일기를 수정했습니다.' : '경력 일기를 저장했습니다.', color: 'green' });
    } catch (error: unknown) {
      toast.add({ title: '경력 일기를 저장하지 못했습니다.', description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.', color: 'red' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id: string) {
    setDeletingId(id);
    try {
      if (isCareerMockMode()) {
        writeMockList('mock_career_diary', readMockList<MockDiaryRecord>('mock_career_diary').filter((entry) => entry.id !== id));
      } else {
        const response = await fetch(`/api/career-diary/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }
      await loadEntries();
      toast.add({ title: '경력 일기를 삭제했습니다.', color: 'green' });
    } catch (error: unknown) {
      toast.add({ title: '경력 일기를 삭제하지 못했습니다.', description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.', color: 'red' });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/career" className="text-xs font-semibold text-blue-600 hover:text-blue-700">경력 관리로 돌아가기</Link>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-blue-500">Career Reflection</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">경력 일기</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">업무에서 배운 점과 다음 행동을 날짜별로 기록하세요. 기록은 본인 계정에서만 확인할 수 있습니다.</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-700">
          <span aria-hidden="true" className="text-lg leading-none">+</span>
          기록 추가
        </button>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="커리어 계획 메뉴">
        <Link href="/career/diary" className="rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white">경력 일기</Link>
        <Link href="/career/goals" className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:border-blue-200 hover:text-blue-600">목표와 마일스톤</Link>
        <Link href="/career/matches" className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:border-blue-200 hover:text-blue-600">후보 직무 추천</Link>
      </nav>

      <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Private by default</p>
            <h2 className="mt-1 text-base font-bold text-gray-900">기록을 판단보다 다음 행동에 연결하세요</h2>
          </div>
          <span className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-blue-600">계정 소유 데이터</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-gray-600">태그와 기록 내용은 목표 키워드와 후보 직무를 탐색할 때만 참고됩니다. 자동 진단이나 사용자 간 매칭으로 사용하지 않습니다.</p>
      </section>

      {loading ? (
        <div className="space-y-4" aria-label="일기 불러오는 중">
          {[0, 1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl border border-gray-100 bg-white" />)}
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-red-200 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-gray-800">일기 목록을 불러오지 못했습니다.</p>
          <button type="button" onClick={loadEntries} className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">다시 시도</button>
        </div>
      ) : entries.length === 0 ? (
        <EmptyState icon="기록" title="아직 기록이 없습니다" description="작은 회고부터 저장하면 다음 목표를 구체화하기 쉬워집니다." actionLabel="첫 기록 작성" onAction={openCreate} />
      ) : (
        <section className="space-y-4" aria-label="경력 일기 목록">
          {entries.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition hover:border-blue-100 hover:shadow-card md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <time dateTime={entry.occurredAt} className="font-semibold text-blue-600">{formatDate(entry.occurredAt)}</time>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-500">{typeLabel(entry.entryType)}</span>
                  </div>
                  <h2 className="mt-3 break-words text-lg font-bold text-gray-900">{entry.title || '제목 없는 기록'}</h2>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-gray-600">{entry.content}</p>
                  {entry.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {entry.tags.map((tag) => <span key={tag} className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-500">{tag}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => openEdit(entry)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-blue-200 hover:text-blue-600">수정</button>
                  <button type="button" onClick={() => deleteEntry(entry.id)} disabled={deletingId === entry.id} className="inline-flex rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50">
                    {deletingId === entry.id ? <Spinner className="h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : '삭제'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowForm(false)}>
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lift md:p-8" role="dialog" aria-modal="true" aria-labelledby="diary-form-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">Career Diary</p>
                <h2 id="diary-form-title" className="mt-1 text-xl font-bold text-gray-900">{editingId ? '기록 수정' : '새 기록'}</h2>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-2 py-1 text-xl leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="닫기">×</button>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold text-gray-700">날짜
                <input type="date" value={form.occurredAt} onChange={(event) => setForm({ ...form, occurredAt: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm font-normal focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="text-sm font-semibold text-gray-700">기록 유형
                <select value={form.entryType} onChange={(event) => setForm({ ...form, entryType: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-normal focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
                  {ENTRY_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700 sm:col-span-2">제목
                <input type="text" maxLength={255} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="오늘의 업무에서 기억할 장면" className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm font-normal focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="text-sm font-semibold text-gray-700 sm:col-span-2">내용 <span className="text-red-500">*</span>
                <textarea rows={7} maxLength={20_000} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="무엇을 했고, 무엇을 배웠으며, 다음에는 무엇을 해볼지 적어보세요." className="mt-2 w-full resize-y rounded-xl border border-gray-200 px-3.5 py-3 text-sm font-normal leading-6 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="text-sm font-semibold text-gray-700 sm:col-span-2">태그
                <input type="text" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="예: 발표, 협업, 성능 개선" className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm font-normal focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                <span className="mt-1 block text-xs font-normal text-gray-400">쉼표로 구분하면 목표 키워드 탐색에 참고됩니다.</span>
              </label>
            </div>
            <div className="mt-7 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">취소</button>
              <button type="button" onClick={saveEntry} disabled={saving || !form.content.trim()} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50">
                {saving && <Spinner className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? '저장 중' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
