'use client';

import { useState, useEffect } from 'react';
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
}

export default function CareerPage() {
  const toast = useToast();

  const [careersList, setCareersList] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CareerSearchResponse | null>(null);

  const [form, setForm] = useState({
    company: '',
    role: '',
    period: '',
    description: '',
  });

  async function fetchCareers() {
    try {
      const res = await fetch('/api/careers');
      if (res.ok) {
        const data = await res.json();
        setCareersList(data || []);
      }
    } catch {} finally {
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

  async function createCareer() {
    if (!form.company || !form.role || !form.description) return;
    setCreating(true);
    try {
      const res = await fetch('/api/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: form.company,
          role: form.role,
          period: form.period || '재직 중',
          description: form.description,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setForm({ company: '', role: '', period: '', description: '' });
        await fetchCareers();
        toast.add({ title: '경력이 추가되었습니다.', color: 'green' });
      }
    } catch (err: unknown) {
      toast.add({ title: '경력 등록 실패', description: (err as Error).message, color: 'red' });
    } finally {
      setCreating(false);
    }
  }

  async function deleteCareer(id: string) {
    try {
      const res = await fetch(`/api/careers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchCareers();
        toast.add({ title: '경력이 삭제되었습니다.', color: 'green' });
      }
    } catch (err: unknown) {
      toast.add({ title: '삭제 실패', description: (err as Error).message, color: 'red' });
    }
  }

  async function performSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/careers/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err: unknown) {
      toast.add({ title: '검색 실패', description: (err as Error).message, color: 'red' });
    } finally {
      setSearching(false);
    }
  }

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
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-all shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          경력 추가
        </button>
      </div>

      {/* Semantic Search */}
      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-blue-600">🔍</span>
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

        {/* Search Results */}
        {searchResults && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-blue-600 font-medium mb-3">
              <span className="min-w-0 truncate">&ldquo;{searchResults.query}&rdquo; 검색 결과</span>
              <button
                onClick={() => {
                  setSearchResults(null);
                  setSearchQuery('');
                }}
                className="text-blue-400 hover:text-blue-600"
              >
                ✕ 초기화
              </button>
            </div>
            {searchResults.results.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">관련 경력을 찾지 못했습니다.</div>
            ) : (
              searchResults.results.map((res) => (
                <div
                  key={res.id}
                  className="bg-white rounded-xl p-4 border border-blue-100 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold text-gray-900 truncate">{res.company}</span>
                      <span className="text-xs text-gray-400 shrink-0">·</span>
                      <span className="text-xs text-gray-600 truncate">{res.role}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 break-words">{res.description}</p>
                  </div>
                  {res.similarity && (
                    <div className="shrink-0 text-center">
                      <div className={`text-lg font-black ${similarityColor(res.similarity)}`}>
                        {(res.similarity * 100).toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-400">%</div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Career Timeline */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">경력 타임라인</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : careersList && careersList.length > 0 ? (
          <div className="relative">
            <div className="absolute left-[22px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-indigo-300 via-violet-200 to-gray-100" />

            <div className="space-y-6">
              {careersList.map((c, idx) => (
                <div key={c.id} className="relative flex gap-5">
                  <div className="shrink-0 w-11 flex justify-center pt-0.5">
                    <div className="w-5 h-5 rounded-full border-2 border-blue-400 bg-white ring-4 ring-blue-50 z-10 relative flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-xs p-4 md:p-5 hover:shadow-sm hover:border-blue-100 transition-all group">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="inline-block text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full mb-2">
                          {c.period}
                        </div>
                        <h3 className="text-base font-bold text-gray-900 break-words">{c.company}</h3>
                        <p className="text-sm text-gray-500 font-medium break-words">{c.role}</p>
                      </div>
                      <button
                        onClick={() => deleteCareer(c.id)}
                        className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors text-xs opacity-0 group-hover:opacity-100"
                      >
                        🗑
                      </button>
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            icon="💼"
            title="등록된 경력이 없습니다"
            description="첫 경력을 추가하고 커리어를 체계적으로 관리하세요"
            actionLabel="경력 추가하기"
            onAction={() => setShowCreateModal(true)}
          />
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[calc(100vw-2rem)] md:max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">경력 추가</h2>
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
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  업무 내용 &amp; 기술 스택 <span className="text-red-400">*</span>
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
                onClick={createCareer}
                disabled={!form.company || !form.role || !form.description || creating}
                className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {creating ? '추가중..' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
