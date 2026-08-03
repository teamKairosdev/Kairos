'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/lib/toast';
import Spinner from '@/components/Spinner';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import type { ATSAnalysisResult } from '@/server/ats';

interface ResumeSummary {
  id: string;
  title: string;
  originalContent: string;
}

const ANALYZE_STEPS = ['이력서 · 채용공고 파싱 중…', '핵심 키워드 매칭 중…', '점수 산출 중…'];

const BREAKDOWN_ITEMS: { key: keyof ATSAnalysisResult['detailedBreakdown']; label: string }[] = [
  { key: 'skillsScore', label: '기술 스택 매칭' },
  { key: 'experienceScore', label: '경력 요건' },
  { key: 'educationScore', label: '학력 요건' },
  { key: 'keywordDensityScore', label: '키워드 밀도' },
];

function ScoreRing({ score }: { score: number }) {
  const R = 45;
  const C = 2 * Math.PI * R;
  const [offset, setOffset] = useState(C);

  useEffect(() => {
    setOffset(C);
    const id = requestAnimationFrame(() => setOffset(C - (C * score) / 100));
    return () => cancelAnimationFrame(id);
  }, [score, C]);

  return (
    <div
      role="progressbar"
      aria-label="ATS 매칭 점수"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      className="relative w-28 h-28 mx-auto"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#f1f5f9" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="#2563eb"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-blue-600 leading-none">{score}</span>
        <span className="text-xs text-gray-400 font-medium mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

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

function ResultSkeleton() {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 space-y-4">
        <div className="skeleton w-28 h-28 rounded-full mx-auto" />
        <div className="skeleton h-4 w-36 mx-auto" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-3">
        <div className="skeleton h-3.5 w-24" />
        <div className="flex gap-2">
          <div className="skeleton h-6 w-16 rounded-full" />
          <div className="skeleton h-6 w-20 rounded-full" />
          <div className="skeleton h-6 w-14 rounded-full" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-3">
        <div className="skeleton h-3.5 w-24" />
        <div className="skeleton h-2 rounded-full" />
        <div className="skeleton h-2 rounded-full" />
        <div className="skeleton h-2 rounded-full" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-3">
        <div className="skeleton h-3.5 w-28" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-11/12" />
        <div className="skeleton h-4 w-4/5" />
      </div>
    </div>
  );
}

export default function ATSPage() {
  const toast = useToast();
  const jdRef = useRef<HTMLTextAreaElement | null>(null);
  const resumeFileRef = useRef<HTMLInputElement | null>(null);

  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<ATSAnalysisResult | null>(null);
  const [isDemoResult, setIsDemoResult] = useState(false);
  const [resultKey, setResultKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [resumesLoading, setResumesLoading] = useState(true);
  const [resumesError, setResumesError] = useState<string | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [dragging, setDragging] = useState(false);

  const loadResumes = useCallback(async () => {
    setResumesLoading(true);
    setResumesError(null);
    try {
      const res = await fetch('/api/resumes');
      if (!res.ok) throw new Error(`이력서 목록을 불러오지 못했습니다. (${res.status})`);
      const data = await res.json();
      setResumes(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '이력서 목록을 불러오지 못했습니다.';
      setResumesError(msg);
      toast.add({ title: '이력서 목록을 불러오지 못했습니다.', description: msg, color: 'red' });
    } finally {
      setResumesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const t = setInterval(() => setStep(s => Math.min(s + 1, ANALYZE_STEPS.length - 1)), 700);
    return () => clearInterval(t);
  }, [loading]);

  function onResumeSelect(id: string) {
    setSelectedResumeId(id);
    const found = resumes.find(r => r.id === id);
    if (found) setResumeText(found.originalContent || '');
  }

  function readTextFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setResumeText(String(reader.result || ''));
    reader.onerror = () => toast.add({ title: '파일을 읽지 못했습니다.', color: 'red' });
    reader.readAsText(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name)) {
      toast.add({ title: '지원하지 않는 파일 형식입니다.', description: 'txt 또는 md 파일을 올려주세요.', color: 'red' });
      return;
    }
    readTextFile(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readTextFile(file);
    e.target.value = '';
  }

  async function analyze() {
    if (!jobTitle.trim() || !jobDescription.trim() || !resumeText.trim()) {
      toast.add({ title: '직무명, 요구사항, 이력서 텍스트를 모두 입력해주세요.', color: 'red' });
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setIsDemoResult(false);
    setResultKey(k => k + 1);
    try {
      const res = await fetch('/api/ats/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle: jobTitle.trim(), jobDescription, resumeText, resumeId: selectedResumeId || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = (data as { error?: string } | null)?.error || `분석에 실패했습니다. (${res.status})`;
        setError(msg);
        toast.add({ title: '분석에 실패했습니다.', description: msg, color: 'red' });
        return;
      }
      const data = await res.json();
      if (!data?.analysis) {
        const msg = '분석 결과를 불러오지 못했습니다.';
        setError(msg);
        toast.add({ title: '분석에 실패했습니다.', description: msg, color: 'red' });
        return;
      }
      setResult(data.analysis as ATSAnalysisResult);
      setIsDemoResult(data.demo === true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.';
      setError(msg);
      toast.add({ title: '분석에 실패했습니다.', description: msg, color: 'red' });
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    const lines = [
      '[ATS 매칭 분석 결과]',
      `매칭 점수: ${result.matchScore}/100`,
      `매칭 키워드: ${result.foundKeywords?.join(', ') || '없음'}`,
      `누락 키워드: ${result.missingKeywords?.join(', ') || '없음'}`,
      '권장사항:',
      ...(result.recommendations || []).map(r => `- ${r}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.add({ title: '분석 결과가 복사되었습니다.', color: 'green' });
    } catch {
      toast.add({ title: '복사에 실패했습니다.', description: '클립보드 접근이 차단되었습니다.', color: 'red' });
    }
  }

  const formComplete = Boolean(jobTitle.trim() && jobDescription.trim() && resumeText.trim());

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">ATS Match</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ATS 매칭 분석</h1>
        <p className="text-sm text-gray-500 mt-1">채용공고와 이력서의 키워드 매칭을 분석하고 개선 포인트를 제공합니다</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-5 min-w-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">채용공고</h2>
            <div>
              <label htmlFor="ats-job-title" className="block text-xs font-semibold text-gray-500 mb-1.5">직무명 *</label>
              <input
                id="ats-job-title"
                type="text"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="예: 프론트엔드 개발자"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label htmlFor="ats-jd" className="block text-xs font-semibold text-gray-500 mb-1.5">요구사항 *</label>
              <textarea
                id="ats-jd"
                ref={jdRef}
                rows={6}
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="채용공고의 요구사항을 붙여넣으세요"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">이력서</h2>
              <button
                onClick={() => resumeFileRef.current?.click()}
                className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
              >
                텍스트 파일 불러오기
              </button>
              <input ref={resumeFileRef} type="file" accept=".txt,.md,text/plain" className="hidden" onChange={onFileChange} />
            </div>

            {resumesLoading ? (
              <div className="skeleton h-10 rounded-xl" />
            ) : resumes.length > 0 ? (
              <select
                value={selectedResumeId}
                onChange={e => onResumeSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">직접 입력</option>
                {resumes.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
            ) : null}

            {resumesError && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-red-500 break-words">{resumesError}</p>
                <button
                  onClick={loadResumes}
                  className="shrink-0 text-xs font-semibold text-blue-600 hover:underline"
                >
                  다시 불러오기
                </button>
              </div>
            )}

            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`relative rounded-2xl border-2 border-dashed transition-colors duration-200 ${
                dragging ? 'border-blue-400 bg-blue-50/40' : 'border-gray-200'
              }`}
            >
              <textarea
                rows={8}
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                placeholder="이력서 텍스트를 붙여넣거나 txt/md 파일을 끌어다 놓으세요"
                className="w-full px-3.5 py-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-transparent resize-none"
              />
              {dragging && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-blue-600 bg-white/90 rounded-lg px-3 py-1.5 shadow-sm">
                    파일을 놓으면 텍스트로 입력됩니다
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={analyze}
              disabled={loading || !formComplete}
              className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              {loading && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? '분석 중…' : 'ATS 분석 시작'}
            </button>
          </div>
        </div>

        <div className="min-w-0">
          {loading ? (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
                <StepIndicator steps={ANALYZE_STEPS} step={step} />
              </div>
              <ResultSkeleton />
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-red-200 shadow-xs p-5 space-y-3 animate-fade-in-up">
              <div className="flex items-start gap-2.5">
                 <span className="text-xs font-semibold shrink-0" aria-hidden="true">주의</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-red-600">분석에 실패했습니다</p>
                  <p className="text-xs text-gray-500 mt-1 break-words">{error}</p>
                </div>
              </div>
              <button
                onClick={analyze}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200 disabled:opacity-40"
              >
                다시 시도
              </button>
            </div>
          ) : !result ? (
            <EmptyState
               icon="분석"
              title="분석 결과가 여기에 표시됩니다"
              description="채용공고와 이력서를 입력하고 ATS 분석을 실행해보세요"
              actionLabel="분석 시작하기"
              onAction={() => jdRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="h-full bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center"
            />
          ) : (
            <div key={resultKey} className="space-y-5 animate-fade-in-up">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 text-center relative">
                <button
                  onClick={copyResult}
                  className="absolute top-4 right-4 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors duration-200 active:scale-[0.98]"
                >
                  결과 복사
                </button>
                <ScoreRing score={result.matchScore} />
                <p className="text-sm font-semibold text-gray-700 mt-3">ATS 매칭 점수</p>
                {isDemoResult && <p className="text-[11px] text-blue-500 mt-1">데모 모드 · 같은 입력은 같은 결과를 반환합니다.</p>}
              </div>

              {result.detailedBreakdown && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 space-y-3.5">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide">세부 진단</h3>
                  {BREAKDOWN_ITEMS.map(item => {
                    const score = result.detailedBreakdown[item.key];
                    return (
                      <div key={item.key} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-xs text-gray-500">{item.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-700"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-right text-xs font-bold text-gray-700">{score}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {result.missingKeywords?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
                  <h3 className="text-xs font-bold text-red-500 uppercase tracking-wide mb-3">누락 키워드</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.map((kw: string) => (
                      <span key={kw} className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-full border border-red-100">{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.foundKeywords?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
                  <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-3">매칭 키워드</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.foundKeywords.map((kw: string) => (
                      <span key={kw} className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full border border-emerald-100">{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.recommendations?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3">개선 권장사항</h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec: string, i: number) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-gray-600 rounded-lg p-1.5 -m-1.5 hover:bg-blue-50/50 hover:text-gray-800 transition-colors duration-200"
                      >
                        <span className="mt-1 shrink-0 w-4 h-4 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center font-bold text-[10px]">{i + 1}</span>
                        <span className="break-words">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
