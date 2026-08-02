'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/lib/toast';
import Spinner from '@/components/Spinner';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';

interface QAPair {
  question: string;
  sampleAnswer: string;
  keyPoints?: string[];
  difficulty?: string;
  questionCategory?: string;
}

interface QASet {
  id: string;
  title?: string;
  targetRole?: string;
  qaPairs?: QAPair[];
  createdAt?: string;
}

const GENERATE_STEPS = ['질문 생성 중…', '모범 답변 작성 중…'];

const DIFFICULTY_LABELS: Record<string, { label: string; className: string }> = {
  easy: { label: '쉬움', className: 'bg-emerald-50 text-emerald-600' },
  medium: { label: '보통', className: 'bg-amber-50 text-amber-600' },
  hard: { label: '어려움', className: 'bg-red-50 text-red-600' },
};

function StepIndicator({ steps, step }: { steps: string[]; step: number }) {
  return (
    <div className="space-y-2.5" role="status" aria-live="polite">
      {steps.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <div
            key={label}
            className={`flex items-center gap-2.5 text-xs font-medium min-w-0 ${
              done ? 'text-emerald-600' : current ? 'text-gray-800' : 'text-gray-300'
            }`}
          >
            {done ? (
              <span className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                ✓
              </span>
            ) : current ? (
              <Spinner className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <span className="w-4 h-4 rounded-full border-2 border-gray-200 shrink-0" />
            )}
            <span className="truncate">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function QACardsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="skeleton h-6 w-40" />
      {[0, 1, 2].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-3">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export default function QAPage() {
  const toast = useToast();
  const roleInputRef = useRef<HTMLInputElement | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [context, setContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultKey, setResultKey] = useState(0);
  const [qaSets, setQaSets] = useState<QASet[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedSet, setSelectedSet] = useState<QASet | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch('/api/qa/list');
      if (!res.ok) throw new Error(`히스토리를 불러오지 못했습니다. (${res.status})`);
      const data = await res.json();
      setQaSets(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '히스토리를 불러오지 못했습니다.';
      setHistoryError(msg);
      toast.add({ title: '히스토리를 불러오지 못했습니다.', description: msg, color: 'red' });
    } finally {
      setHistoryLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!generating) return;
    setStep(0);
    const t = setInterval(() => setStep(s => Math.min(s + 1, GENERATE_STEPS.length - 1)), 700);
    return () => clearInterval(t);
  }, [generating]);

  async function generate() {
    if (!targetRole.trim()) {
      roleInputRef.current?.focus();
      toast.add({ title: '목표 직무를 입력해주세요.', color: 'red' });
      return;
    }
    setGenerating(true);
    setError(null);
    setSelectedSet(null);
    setResultKey(k => k + 1);
    try {
      const res = await fetch('/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole: targetRole.trim(), careerSummary: context.trim() || '경력 요약 없음', count: 5 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = (data as { error?: string } | null)?.error || `Q&A 생성에 실패했습니다. (${res.status})`;
        setError(msg);
        toast.add({ title: 'Q&A 생성에 실패했습니다.', description: msg, color: 'red' });
        return;
      }
      const data = await res.json();
      if (!data?.qaPairs) {
        const msg = '생성 결과를 불러오지 못했습니다.';
        setError(msg);
        toast.add({ title: 'Q&A 생성에 실패했습니다.', description: msg, color: 'red' });
        return;
      }
      const next: QASet = {
        id: data.id,
        title: data.title,
        targetRole: data.targetRole || targetRole.trim(),
        qaPairs: data.qaPairs,
        createdAt: data.createdAt,
      };
      setSelectedSet(next);
      setQaSets(prev => [next, ...prev.filter(s => s.id !== next.id)]);
      setExpandedIdx(0);
      toast.add({ title: 'Q&A가 생성되었습니다.', color: 'green' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.';
      setError(msg);
      toast.add({ title: 'Q&A 생성에 실패했습니다.', description: msg, color: 'red' });
    } finally {
      setGenerating(false);
    }
  }

  function deleteSet(id: string) {
    if (!window.confirm('이 Q&A 세트를 목록에서 삭제하시겠습니까?')) return;
    setQaSets(prev => prev.filter(s => s.id !== id));
    if (selectedSet?.id === id) setSelectedSet(null);
    toast.add({ title: '삭제되었습니다.', color: 'green' });
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">Q&A Generator</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">면접 Q&A 생성기</h1>
        <p className="text-sm text-gray-500 mt-1">목표 직무와 경력을 바탕으로 면접 질문과 모범 답변을 생성합니다</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4 min-w-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Q&A 생성</h2>
            <div>
              <label htmlFor="qa-role" className="block text-xs font-semibold text-gray-500 mb-1.5">목표 직무 *</label>
              <input
                id="qa-role"
                ref={roleInputRef}
                type="text"
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                placeholder="예: 프론트엔드 개발자"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label htmlFor="qa-context" className="block text-xs font-semibold text-gray-500 mb-1.5">경력 요약 (선택)</label>
              <textarea
                id="qa-context"
                rows={4}
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="보유 기술, 경험, 회사 정보 등을 입력하세요"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>
            <button
              onClick={generate}
              disabled={generating || !targetRole.trim()}
              className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              {generating && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {generating ? '생성 중…' : 'Q&A 생성'}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">히스토리</h3>
              {!historyLoading && !historyError && (
                <span className="text-[11px] text-gray-400">{qaSets.length}개</span>
              )}
            </div>
            {historyLoading ? (
              <div className="p-4 space-y-2.5">
                <div className="skeleton h-9 rounded-lg" />
                <div className="skeleton h-9 rounded-lg" />
                <div className="skeleton h-9 rounded-lg" />
              </div>
            ) : historyError ? (
              <div className="p-4 space-y-2">
                <p className="text-xs text-red-500 break-words">{historyError}</p>
                <button onClick={loadHistory} className="text-xs font-semibold text-blue-600 hover:underline">
                  다시 불러오기
                </button>
              </div>
            ) : qaSets.length === 0 ? (
              <div className="px-5 py-8 text-center space-y-2">
                <p className="text-sm font-medium text-gray-600">아직 생성한 Q&A가 없습니다</p>
                <p className="text-xs text-gray-400">목표 직무를 입력하고 첫 Q&A 세트를 만들어보세요</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {qaSets.map(s => (
                  <div key={s.id} className="flex items-center gap-2 px-3 pr-2 group hover:bg-gray-50/70 transition-colors duration-200">
                    <button
                      onClick={() => { setSelectedSet(s); setExpandedIdx(0); }}
                      className="flex-1 min-w-0 py-3 text-left"
                    >
                      <span className={`block text-xs font-medium truncate ${selectedSet?.id === s.id ? 'text-blue-600' : 'text-gray-700'}`}>
                        {s.targetRole}
                      </span>
                      <span className="block text-[11px] text-gray-400 mt-0.5">
                        {s.qaPairs?.length || 0}문항 · {formatDate(s.createdAt)}
                      </span>
                    </button>
                    <button
                      onClick={() => deleteSet(s.id)}
                      aria-label={`${s.targetRole} 삭제`}
                      className="shrink-0 px-2 py-1 text-[11px] font-semibold text-red-400 bg-red-50/60 rounded-lg hover:text-red-600 hover:bg-red-100 transition-colors duration-200"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 min-w-0">
          {generating ? (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
                <StepIndicator steps={GENERATE_STEPS} step={step} />
              </div>
              <QACardsSkeleton />
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-red-200 shadow-xs p-5 space-y-3 animate-fade-in-up">
              <div className="flex items-start gap-2.5">
                <span className="text-lg shrink-0" aria-hidden="true">⚠️</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-red-600">Q&A 생성에 실패했습니다</p>
                  <p className="text-xs text-gray-500 mt-1 break-words">{error}</p>
                </div>
              </div>
              <button
                onClick={generate}
                disabled={generating}
                className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200 disabled:opacity-40"
              >
                다시 시도
              </button>
            </div>
          ) : !selectedSet ? (
            <EmptyState
              icon="🎯"
              title="생성된 Q&A가 여기에 표시됩니다"
              description="목표 직무를 입력하고 Q&A 세트를 생성해보세요"
              actionLabel="Q&A 생성하기"
              onAction={() => roleInputRef.current?.focus()}
              className="h-full bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center"
            />
          ) : (
            <div key={resultKey} className="space-y-3 animate-fade-in-up">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <h2 className="text-sm font-bold text-gray-800 break-words">{selectedSet.targetRole}</h2>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedSet.createdAt && (
                    <span className="text-[11px] text-gray-400">{formatDate(selectedSet.createdAt)}</span>
                  )}
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-[11px] font-semibold">
                    {selectedSet.qaPairs?.length || 0}문항
                  </span>
                </div>
              </div>
              {(selectedSet.qaPairs || []).map((qa, i) => {
                const diff = qa.difficulty ? DIFFICULTY_LABELS[qa.difficulty] : null;
                return (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                    <button
                      onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                      aria-expanded={expandedIdx === i}
                      className="w-full px-5 py-4 text-left flex items-start justify-between gap-3 hover:bg-gray-50/50 transition-colors duration-200"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-black flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-sm font-semibold text-gray-800 text-left break-words">{qa.question}</p>
                      </div>
                      <span className={`text-gray-400 text-xs transition-transform shrink-0 mt-1 ${expandedIdx === i ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    {expandedIdx === i && (
                      <div className="px-5 pb-5 border-t border-gray-50">
                        <div className="pt-4 space-y-3">
                          {diff && (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${diff.className}`}>
                              난이도: {diff.label}
                            </span>
                          )}
                          <p className="text-sm text-gray-700 leading-relaxed break-words">{qa.sampleAnswer}</p>
                          {qa.keyPoints && qa.keyPoints.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">핵심 포인트</p>
                              <ul className="space-y-1">
                                {qa.keyPoints.map((kp, ki) => (
                                  <li key={ki} className="flex items-start gap-2 text-xs text-gray-600">
                                    <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400" />
                                    <span className="break-words">{kp}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
