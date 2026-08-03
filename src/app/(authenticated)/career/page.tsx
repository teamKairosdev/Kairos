'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/lib/toast';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';

interface Career {
  id: string;
  userId?: string;
  company: string;
  role: string;
  period: string;
  description: string;
  achievements?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface CareerSearchResult extends Career {
  similarity: number;
}

interface CareerSearchResponse {
  query: string;
  results: CareerSearchResult[];
  demo?: boolean;
}

const SEARCH_STEPS = ['임베딩 생성 중…', '관련 이력 검색 중…', '결과 정리 중…'];

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function CareerPage() {
  const toast = useToast();

  const [careersList, setCareersList] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Career | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchStep, setSearchStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CareerSearchResponse | null>(null);
  const [searchError, setSearchError] = useState(false);

  const [form, setForm] = useState({
    company: '',
    role: '',
    period: '',
    techStack: '',
    description: '',
  });

  async function fetchCareers() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch('/api/careers');
      if (!res.ok) {
        setLoadError(true);
        toast.add({ title: '경력 목록을 불러오지 못했습니다.', color: 'red' });
        return;
      }
      const data = await res.json();
      setCareersList(data || []);
    } catch {
      setLoadError(true);
      toast.add({ title: '경력 목록을 불러오지 못했습니다.', description: '잠시 후 다시 시도해주세요.', color: 'red' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCareers();
  }, []);

  function similarityColor(sim: number) {
    if (sim >= 0.8) return 'text-emerald-600';
    if (sim >= 0.6) return 'text-blue-600';
    if (sim >= 0.4) return 'text-amber-600';
    return 'text-gray-500';
  }

  function openCreateModal() {
    setEditingId(null);
    setForm({ company: '', role: '', period: '', techStack: '', description: '' });
    setShowCreateModal(true);
  }

  function openEditModal(c: Career) {
    setEditingId(c.id);
    setForm({
      company: c.company,
      role: c.role,
      period: c.period,
      techStack: (c.achievements || []).join(', '),
      description: c.description,
    });
    setShowCreateModal(true);
  }

  async function saveCareer() {
    if (!form.company || !form.role || !form.description) return;
    const payload = {
      company: form.company,
      role: form.role,
      period: form.period || '재직 중',
      description: form.description,
      achievements: form.techStack
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
    };

    if (editingId) {
      setSaving(true);
      try {
        const res = await fetch(`/api/careers/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setShowCreateModal(false);
          setEditingId(null);
          await fetchCareers();
          toast.add({ title: '경력이 수정되었습니다.', color: 'green' });
        } else {
          const err = await res.json().catch(() => null);
          toast.add({ title: '경력 수정 실패', description: err?.error || `HTTP ${res.status}`, color: 'red' });
        }
      } catch (err: unknown) {
        toast.add({ title: '경력 수정 실패', description: (err as Error).message, color: 'red' });
      } finally {
        setSaving(false);
      }
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setForm({ company: '', role: '', period: '', techStack: '', description: '' });
        await fetchCareers();
        toast.add({ title: '경력이 추가되었습니다.', color: 'green' });
      } else {
        const err = await res.json().catch(() => null);
        toast.add({ title: '경력 등록 실패', description: err?.error || `HTTP ${res.status}`, color: 'red' });
      }
    } catch (err: unknown) {
      toast.add({ title: '경력 등록 실패', description: (err as Error).message, color: 'red' });
    } finally {
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/careers/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        await fetchCareers();
        toast.add({ title: '경력이 삭제되었습니다.', color: 'green' });
      } else {
        const err = await res.json().catch(() => null);
        toast.add({ title: '삭제 실패', description: err?.error || `HTTP ${res.status}`, color: 'red' });
      }
    } catch (err: unknown) {
      toast.add({ title: '삭제 실패', description: (err as Error).message, color: 'red' });
    } finally {
      setDeleting(false);
    }
  }

  async function performSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(false);
    setSearchStep(0);
    setSearchResults(null);
    try {
      const res = await fetch(`/api/careers/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        setSearchError(true);
        toast.add({ title: '검색 서비스 오류', description: `HTTP ${res.status}`, color: 'red' });
        return;
      }
      const data = (await res.json()) as CareerSearchResponse;
      if (data.results.some(r => r.id.startsWith('demo-'))) {
        setSearchError(true);
        toast.add({ title: '검색 서비스 오류', description: '일시적으로 검색을 사용할 수 없습니다.', color: 'red' });
        return;
      }
      setSearchResults(data);
    } catch (err: unknown) {
      setSearchError(true);
      toast.add({ title: '검색 서비스 오류', description: (err as Error).message, color: 'red' });
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    if (!searching) return;
    const timer = setTimeout(() => setSearchStep(1), 900);
    const timer2 = setTimeout(() => setSearchStep(2), 1800);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [searching]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">Career History</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">경력 관리</h1>
          <p className="text-sm text-gray-500 mt-1">커리어 이력을 체계적으로 기록하고 AI 시맨틱 검색으로 찾아보세요</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-all active:scale-[0.98] shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          경력 추가
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-500">Career Planning</p>
            <h2 className="mt-1 text-base font-bold text-gray-900">기록한 경력을 다음 선택으로 연결하세요</h2>
            <p className="mt-1 text-sm text-gray-500">일기, 목표, 후보 직무 탐색을 개인 기록으로 관리할 수 있습니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/career/diary" className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-blue-200 hover:text-blue-600">경력 일기</Link>
            <Link href="/career/goals" className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-violet-200 hover:text-violet-600">목표와 마일스톤</Link>
            <Link href="/career/matches" className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-700">후보 직무 추천</Link>
          </div>
        </div>
      </div>

      {/* Semantic Search */}
      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-blue-600" aria-hidden="true">검색</span>
          <span className="text-sm font-semibold text-blue-800">AI 시맨틱 검색</span>
          <span className="text-xs text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full">pgvector 1536차원</span>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && performSearch()}
            placeholder="예: React로 대용량 데이터 처리 경험"
            className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-white border border-blue-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all shadow-xs"
          />
          <button
            onClick={performSearch}
            disabled={!searchQuery.trim() || searching}
            className="shrink-0 px-5 py-2.5 min-h-[44px] bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {searching && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>{searching ? '검색중..' : '검색'}</span>
          </button>
        </div>

        {searching && (
          <div className="mt-4 flex items-center gap-3 text-sm text-blue-600 font-medium">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-blue-300 animate-bounce [animation-delay:300ms]" />
            </div>
            <span>{SEARCH_STEPS[searchStep]}</span>
          </div>
        )}

        {searchError && (
          <div className="mt-4 bg-white rounded-xl border border-red-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in-up">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">검색 서비스 오류</p>
              <p className="text-xs text-gray-500 mt-0.5">일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
            </div>
            <button
              onClick={performSearch}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors active:scale-[0.98]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              재시도
            </button>
          </div>
        )}

        {/* Search Results */}
        {searchResults && !searching && (
          <div className="mt-4 space-y-2 animate-fade-in-up">
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-blue-600 font-medium mb-3">
              <span className="min-w-0 truncate">&ldquo;{searchResults.query}&rdquo; 검색 결과</span>
              {searchResults.demo && <span className="shrink-0 text-[10px] font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">데모 결과</span>}
              <button
                onClick={() => {
                  setSearchResults(null);
                  setSearchError(false);
                  setSearchQuery('');
                }}
                className="text-blue-400 hover:text-blue-600"
              >
                초기화
              </button>
            </div>
            {searchResults.results.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">관련 경력을 찾지 못했습니다.</div>
            ) : (
              searchResults.results.map((res) => (
                <Link
                  key={res.id}
                  href={`/career/${res.id}`}
                  className="block bg-white rounded-xl p-4 border border-blue-100 hover:shadow-card hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-bold text-gray-900 truncate">{res.company}</span>
                        <span className="text-xs text-gray-400 shrink-0">·</span>
                        <span className="text-xs text-gray-600 truncate">{res.role}</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 break-words">{res.description}</p>
                    </div>
                    {res.similarity != null && (
                      <div className="shrink-0 text-center">
                        <div className={`text-lg font-black ${similarityColor(res.similarity)}`}>
                          {Math.round(Number(res.similarity) * 100)}
                        </div>
                        <div className="text-xs text-gray-400">%</div>
                      </div>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {/* Career Timeline */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">경력 타임라인</h2>

        {loading ? (
          <div className="space-y-6">
            {[0, 1, 2].map(i => (
              <div key={i} className="relative flex gap-5">
                <div className="shrink-0 w-11 flex justify-center pt-0.5">
                  <div className="skeleton animate-pulse w-5 h-5 rounded-full" />
                </div>
                <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-xs p-4 md:p-5 space-y-3">
                  <div className="skeleton animate-pulse h-5 w-24 rounded-full" />
                  <div className="skeleton animate-pulse h-4 w-40" />
                  <div className="skeleton animate-pulse h-3 w-full" />
                  <div className="skeleton animate-pulse h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-2xl border border-red-200 p-10 text-center space-y-4 animate-fade-in-up">
            <div className="text-sm font-semibold">주의</div>
            <div>
              <p className="text-sm font-semibold text-gray-800">경력 목록을 불러오지 못했습니다</p>
              <p className="text-xs text-gray-500 mt-1">서버 연결 상태를 확인하고 다시 시도해주세요.</p>
            </div>
            <button
              onClick={fetchCareers}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              재시도
            </button>
          </div>
        ) : careersList && careersList.length > 0 ? (
          <div className="relative">
            <div className="absolute left-[22px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-indigo-300 via-violet-200 to-gray-100" />

            <div className="space-y-6">
              {careersList.map((c) => (
                <div key={c.id} className="relative flex gap-5">
                  <div className="shrink-0 w-11 flex justify-center pt-0.5">
                    <div className="w-5 h-5 rounded-full border-2 border-blue-400 bg-white ring-4 ring-blue-50 z-10 relative flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-xs p-4 md:p-5 hover:shadow-card hover:border-blue-100 hover:-translate-y-0.5 transition-all duration-200 group">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="inline-block text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full mb-2">
                          {c.period}
                        </div>
                        <Link href={`/career/${c.id}`} className="block">
                          <h3 className="text-base font-bold text-gray-900 break-words group-hover:text-blue-600 transition-colors">{c.company}</h3>
                          <p className="text-sm text-gray-500 font-medium break-words">{c.role}</p>
                        </Link>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditModal(c)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors text-xs opacity-0 group-hover:opacity-100"
                          aria-label="수정"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors text-xs opacity-0 group-hover:opacity-100"
                          aria-label="삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 leading-relaxed break-words">{c.description}</p>

                    {c.achievements && c.achievements.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">주요 성과</p>
                        <ul className="space-y-1">
                          {c.achievements.map((a: string, aIdx: number) => (
                            <li key={aIdx} className="flex items-start gap-2 text-xs text-gray-600">
                              <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-blue-400" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {c.createdAt && (
                      <p className="mt-3 text-[11px] text-gray-400">등록일: {formatDate(c.createdAt)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            icon="경력"
            title="등록된 경력이 없습니다"
            description="첫 경력을 추가하고 커리어를 체계적으로 관리하세요"
            actionLabel="경력 추가하기"
            onAction={openCreateModal}
          />
        )}
      </div>

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[calc(100vw-2rem)] md:max-w-md p-6 space-y-5 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? '경력 수정' : '경력 추가'}</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    회사 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={e => setForm({ ...form, company: e.target.value })}
                    placeholder="카카오"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    직무 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                    placeholder="프론트엔드 엔지니어"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">기간</label>
                <input
                  type="text"
                  value={form.period}
                  onChange={e => setForm({ ...form, period: e.target.value })}
                  placeholder="2023.01 - 2026.07 (재직 중)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">기술 스택</label>
                <input
                  type="text"
                  value={form.techStack}
                  onChange={e => setForm({ ...form, techStack: e.target.value })}
                  placeholder="React, TypeScript, Next.js"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  업무 내용 &amp; 주요 설명 <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="담당했던 업무, 사용한 기술 스택, 주요 프로젝트를 기술해주세요."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={saveCareer}
                disabled={!form.company || !form.role || !form.description || creating || saving}
                className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {editingId
                  ? saving ? '저장 중..' : '저장'
                  : creating ? '추가중..' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setDeleteTarget(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-fade-in-up">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-red-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-900">경력을 삭제할까요?</h3>
              <p className="text-xs text-gray-500">
                &ldquo;{deleteTarget.company} - {deleteTarget.role}&rdquo; 경력이 영구 삭제됩니다.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
