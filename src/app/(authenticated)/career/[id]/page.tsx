'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  results: CareerSearchResult[];
  demo?: boolean;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function CareerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const toast = useToast();

  const [career, setCareer] = useState<Career | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [similar, setSimilar] = useState<CareerSearchResult[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarDemo, setSimilarDemo] = useState(false);

  const [form, setForm] = useState({
    company: '',
    role: '',
    period: '',
    techStack: '',
    description: '',
  });

  async function fetchCareer() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch('/api/careers');
      if (!res.ok) {
        setLoadError(true);
        return;
      }
      const list = (await res.json()) as Career[];
      const found = list.find(c => c.id === id) || null;
      if (!found) {
        setLoadError(true);
        return;
      }
      setCareer(found);
      setForm({
        company: found.company,
        role: found.role,
        period: found.period,
        techStack: (found.achievements || []).join(', '),
        description: found.description,
      });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCareer();
  }, [id]);

  useEffect(() => {
    if (!career) return;
    let cancelled = false;
    const query = `${career.company} ${career.role} ${career.description}`;
    setSimilarLoading(true);
    fetch(`/api/careers/search?q=${encodeURIComponent(query)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
         if (cancelled || !data) return;
         const response = data as CareerSearchResponse;
         const filtered = response.results
           .filter(r => r.id !== career.id && !String(r.id).startsWith('demo-'));
         setSimilarDemo(response.demo === true);
         setSimilar(filtered);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSimilarLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [career]);

  async function saveCareer() {
    if (!form.company || !form.role || !form.description) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/careers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: form.company,
          role: form.role,
          period: form.period || '재직 중',
          description: form.description,
          achievements: form.techStack
            .split(',')
            .map(t => t.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        setShowEditModal(false);
        await fetchCareer();
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
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/careers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.add({ title: '경력이 삭제되었습니다.', color: 'green' });
        router.push('/career');
      } else {
        const err = await res.json().catch(() => null);
        toast.add({ title: '삭제 실패', description: err?.error || `HTTP ${res.status}`, color: 'red' });
        setDeleting(false);
      }
    } catch (err: unknown) {
      toast.add({ title: '삭제 실패', description: (err as Error).message, color: 'red' });
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="skeleton animate-pulse h-5 w-32" />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 md:p-8 space-y-5">
          <div className="skeleton animate-pulse h-6 w-24 rounded-full" />
          <div className="skeleton animate-pulse h-8 w-64" />
          <div className="skeleton animate-pulse h-4 w-40" />
          <div className="skeleton animate-pulse h-4 w-full" />
          <div className="skeleton animate-pulse h-4 w-full" />
          <div className="skeleton animate-pulse h-4 w-3/4" />
          <div className="skeleton animate-pulse h-5 w-28" />
          <div className="skeleton animate-pulse h-3 w-1/2" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 space-y-4">
          <div className="skeleton animate-pulse h-5 w-40" />
          <div className="skeleton animate-pulse h-16 w-full rounded-xl" />
          <div className="skeleton animate-pulse h-16 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (loadError || !career) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-10 text-center space-y-4 animate-fade-in-up">
        <div className="text-sm font-semibold">주의</div>
        <div>
          <p className="text-sm font-semibold text-gray-800">경력 정보를 불러오지 못했습니다</p>
          <p className="text-xs text-gray-500 mt-1">항목이 삭제되었거나 서버 연결에 문제가 있을 수 있습니다.</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← 뒤로 가기
          </button>
          <button
            onClick={fetchCareer}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            재시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link
        href="/career"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-blue-600 transition-colors"
      >
        ← 경력 목록으로 돌아가기
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 md:p-8 animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-block text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full mb-3">
              {career.period}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight break-words">{career.company}</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">{career.role}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-gray-700 transition-colors active:scale-[0.98]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              수정
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-red-200 text-red-500 text-xs font-semibold rounded-xl hover:bg-red-50 transition-colors active:scale-[0.98]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              삭제
            </button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-50 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">업무 내용</h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words">{career.description}</p>
          </div>

          {career.achievements && career.achievements.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">기술 스택 · 주요 성과</h3>
              <div className="flex flex-wrap gap-2">
                {career.achievements.map((a: string, aIdx: number) => (
                  <span
                    key={aIdx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-100"
                  >
                    <span className="w-1 h-1 rounded-full bg-blue-400" />
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {career.createdAt && (
            <p className="text-[11px] text-gray-400">등록일: {formatDate(career.createdAt)}</p>
          )}
        </div>
      </div>

      {/* Similar Careers */}
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">유사 경력 추천</h2>
          {similarDemo && <span className="text-[10px] font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">데모 결과</span>}
        </div>
        {similarLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="skeleton animate-pulse h-20 rounded-xl" />
            <div className="skeleton animate-pulse h-20 rounded-xl" />
          </div>
        ) : similar.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {similar.map(r => (
              <Link
                key={r.id}
                href={`/career/${r.id}`}
                className="block bg-white rounded-2xl border border-gray-100 shadow-xs p-4 hover:shadow-card hover:border-blue-100 hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{r.company}</span>
                      <span className="text-xs text-gray-400 shrink-0">·</span>
                      <span className="text-xs text-gray-600 truncate">{r.role}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 break-words">{r.description}</p>
                  </div>
                  {r.similarity != null && (
                    <div className="shrink-0 text-center">
                      <div className="text-base font-black text-blue-600">{Math.round(Number(r.similarity) * 100)}</div>
                      <div className="text-[10px] text-gray-400">% 일치</div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="추천"
            title="유사 경력을 찾지 못했습니다"
            description="경력을 더 추가하면 AI가 유사한 이력을 추천해드립니다"
            className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center"
            iconWrapperClass="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-400 text-xl"
          />
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowEditModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[calc(100vw-2rem)] md:max-w-md p-6 space-y-5 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">경력 수정</h2>
              <button
                onClick={() => setShowEditModal(false)}
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
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={saveCareer}
                disabled={!form.company || !form.role || !form.description || saving}
                className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {saving ? '저장 중..' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowDeleteModal(false)}
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
                &ldquo;{career.company} - {career.role}&rdquo; 경력이 영구 삭제됩니다.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
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
