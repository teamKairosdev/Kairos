'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/lib/toast';
import Spinner from '@/components/Spinner';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';

interface HumanizerEntry {
  id?: string;
  originalText?: string;
  humanizedText?: string;
  styleScore?: number | null;
  createdAt?: string;
}

const HUMANIZE_STEPS = ['원문 분석 중…', '자연스러운 문장으로 변환 중…'];

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

export default function HumanizerPage() {
  const toast = useToast();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const outputRef = useRef<HTMLTextAreaElement | null>(null);
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HumanizerEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [styleScore, setStyleScore] = useState<number | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch('/api/humanizer/history');
      if (!res.ok) throw new Error(`히스토리를 불러오지 못했습니다. (${res.status})`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
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
    if (!loading) return;
    setStep(0);
    const t = setInterval(() => setStep(s => Math.min(s + 1, HUMANIZE_STEPS.length - 1)), 700);
    return () => clearInterval(t);
  }, [loading]);

  async function humanize() {
    if (!inputText.trim()) {
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    setOutputText('');
    setStyleScore(null);
    setSelectedHistoryId(null);
    try {
      const res = await fetch('/api/humanizer/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalText: inputText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = (data as { error?: string } | null)?.error || `변환에 실패했습니다. (${res.status})`;
        setError(msg);
        toast.add({ title: '변환에 실패했습니다.', description: msg, color: 'red' });
        return;
      }
      const data = await res.json();
      if (!data?.humanizedText) {
        const msg = '변환 결과를 불러오지 못했습니다.';
        setError(msg);
        toast.add({ title: '변환에 실패했습니다.', description: msg, color: 'red' });
        return;
      }
      const next: HumanizerEntry = {
        id: data.id,
        originalText: inputText,
        humanizedText: data.humanizedText,
        styleScore: data.styleScore ?? null,
        createdAt: data.createdAt,
      };
      setOutputText(data.humanizedText);
      setStyleScore(data.styleScore ?? null);
      setSelectedHistoryId(next.id ?? null);
      setHistory(prev => [next, ...prev.filter(h => h.id !== next.id)]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.';
      setError(msg);
      toast.add({ title: '변환에 실패했습니다.', description: msg, color: 'red' });
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      toast.add({ title: '복사되었습니다.', color: 'green' });
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = outputText;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast.add({ title: '복사되었습니다.', color: 'green' });
      } catch {
        toast.add({ title: '복사에 실패했습니다.', description: '클립보드 접근이 차단되었습니다.', color: 'red' });
      }
    }
  }

  function viewHistory(entry: HumanizerEntry) {
    if (!entry.humanizedText) return;
    setOutputText(entry.humanizedText);
    setStyleScore(entry.styleScore ?? null);
    setSelectedHistoryId(entry.id ?? null);
    outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function deleteHistory(id: string) {
    if (!window.confirm('이 기록을 목록에서 삭제하시겠습니까?')) return;
    setHistory(prev => prev.filter(h => h.id !== id));
    if (selectedHistoryId === id) {
      setOutputText('');
      setStyleScore(null);
      setSelectedHistoryId(null);
    }
    toast.add({ title: '삭제되었습니다.', color: 'green' });
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">AI Humanizer</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI 텍스트 휴머나이저</h1>
        <p className="text-sm text-gray-500 mt-1">AI가 생성한 문장을 자연스러운 사람의 문장으로 변환합니다</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <label htmlFor="hum-input" className="text-xs font-bold text-gray-500 uppercase tracking-wide">입력 (AI 문장)</label>
            <span className="text-xs text-gray-400">{inputText.length}자</span>
          </div>
          <textarea
            id="hum-input"
            ref={inputRef}
            rows={14}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="AI가 생성한 문장을 붙여넣으세요"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none leading-relaxed"
          />
          <button
            onClick={humanize}
            disabled={loading || !inputText.trim()}
            className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            {loading && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? '변환 중…' : '휴머나이즈'}
          </button>
        </div>

        <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <label htmlFor="hum-output" className="text-xs font-bold text-gray-500 uppercase tracking-wide">결과 (자연스러운 문장)</label>
            {styleScore !== null && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                자연스러움 {styleScore}%
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
                <StepIndicator steps={HUMANIZE_STEPS} step={step} />
              </div>
              <div className="skeleton h-[340px] rounded-2xl" />
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-red-200 shadow-xs p-5 space-y-3 animate-fade-in-up">
              <div className="flex items-start gap-2.5">
                <span className="text-lg shrink-0" aria-hidden="true">⚠️</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-red-600">변환에 실패했습니다</p>
                  <p className="text-xs text-gray-500 mt-1 break-words">{error}</p>
                </div>
              </div>
              <button
                onClick={humanize}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200 disabled:opacity-40"
              >
                다시 시도
              </button>
            </div>
          ) : outputText ? (
            <div className="space-y-3 animate-fade-in-up">
              <div className="relative">
                <textarea
                  id="hum-output"
                  ref={outputRef}
                  rows={14}
                  value={outputText}
                  readOnly
                  placeholder="변환된 문장이 여기에 표시됩니다"
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-sm bg-gray-50/50 resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={copyToClipboard}
                  className="absolute top-3 right-3 px-3.5 py-2.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-all duration-200 shadow-xs active:scale-[0.98]"
                >
                  복사
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 flex flex-col items-center justify-center gap-3 text-center h-full">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl">✍️</div>
              <p className="text-sm font-medium text-gray-600">변환된 문장이 여기에 표시됩니다</p>
              <p className="text-xs text-gray-400">왼쪽 입력란에 AI 문장을 붙여넣고 휴머나이즈를 실행하세요</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">히스토리</h2>
          {!historyLoading && !historyError && (
            <span className="text-xs text-gray-400">{history.length}개</span>
          )}
        </div>
        {historyLoading ? (
          <div className="p-4 space-y-2.5">
            <div className="skeleton h-11 rounded-lg" />
            <div className="skeleton h-11 rounded-lg" />
            <div className="skeleton h-11 rounded-lg" />
          </div>
        ) : historyError ? (
          <div className="p-4 space-y-2">
            <p className="text-xs text-red-500 break-words">{historyError}</p>
            <button onClick={loadHistory} className="text-xs font-semibold text-blue-600 hover:underline">
              다시 불러오기
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="px-6 py-10">
            <EmptyState
              icon="📝"
              title="아직 변환 기록이 없습니다"
              description="AI 문장을 입력하고 첫 변환을 실행해보세요"
              actionLabel="휴머나이즈 시작"
              onAction={() => inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="border-none p-0 bg-transparent"
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.slice(0, 5).map(h => (
              <div key={h.id} className="flex items-start gap-3 px-4 sm:px-6 py-3.5 group hover:bg-gray-50/70 transition-colors duration-200">
                <button onClick={() => viewHistory(h)} className="flex-1 min-w-0 text-left">
                  <span className="block text-xs text-gray-500 truncate">{h.originalText}</span>
                  <span className={`block text-xs font-medium truncate mt-1 ${selectedHistoryId === h.id ? 'text-blue-600' : 'text-gray-800'}`}>
                    {h.humanizedText}
                  </span>
                  <span className="block text-[11px] text-gray-400 mt-1">{formatDate(h.createdAt)}</span>
                </button>
                <div className="flex items-center gap-2 shrink-0 mt-1">
                  {h.styleScore != null && (
                    <span className="text-xs font-bold text-emerald-600">{h.styleScore}%</span>
                  )}
                  <button
                    onClick={() => viewHistory(h)}
                    className="px-2 py-1 text-[11px] font-semibold text-blue-500 bg-blue-50/60 rounded-lg hover:text-blue-600 hover:bg-blue-100 transition-colors duration-200"
                  >
                    다시보기
                  </button>
                  <button
                    onClick={() => deleteHistory(h.id ?? '')}
                    aria-label="기록 삭제"
                    className="px-2 py-1 text-[11px] font-semibold text-red-400 bg-red-50/60 rounded-lg hover:text-red-600 hover:bg-red-100 transition-colors duration-200"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
