'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { useToast } from '@/lib/toast';
import { renderDiffHtml } from '@/utils/diff';
import Spinner from '@/components/Spinner';

interface EvaluationFeedback {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

interface RefinementHistoryEntry {
  id: string;
  resumeId: string;
  step: string;
  draftContent: string;
  score: number;
  improvedContent?: string | null;
  createdAt: string;
  evaluationFeedback?: EvaluationFeedback | null;
}

interface ResumeDetailResponse {
  resume: {
    id: string;
    title: string;
    status: string;
    currentScore: number | null;
    demo?: boolean;
    originalContent: string;
  };
  refinementHistory: RefinementHistoryEntry[];
}

interface ChatApiResponse {
  responseText: string;
  suggestedContent?: string;
}

interface ResumeChatStreamEvent {
  type: 'start' | 'text' | 'suggestion' | 'suggestion_error' | 'done' | 'error';
  value?: string;
}

interface ResumeCompareResponse {
  current: {
    sectionCompleteness: {
      score: number;
      completed: number;
      total: number;
      missing: string[];
    };
    keywordCount: number;
    sentenceLength: {
      averageWords: number;
      sentenceCount: number;
    };
    jobMatch: {
      status: 'calculated' | 'not_provided';
      score: number | null;
      matchedKeywords: string[];
      missingKeywords: string[];
    };
  };
  baseline: {
    source: 'cohort' | 'example';
    status: 'actual' | 'insufficient_data';
    label: string;
    sampleSize: number;
    minimumSampleSize: number;
    isActual: boolean;
    metrics: {
      sectionCompleteness: { score: number };
      keywordCount: number;
      sentenceLength: { averageWords: number };
      jobMatch: { score: number | null };
    };
    notice: string;
  };
  comparisons: {
    sectionCompleteness: { current: number | null; baseline: number | null; delta: number | null };
    keywordCount: { current: number | null; baseline: number | null; delta: number | null };
    sentenceLength: { current: number | null; baseline: number | null; delta: number | null };
    jobMatch: { current: number | null; baseline: number | null; delta: number | null };
  };
  weaknesses: string[];
  suggestions: string[];
  privacyNotice: string;
  disclaimer: string;
}

export default function ResumeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'editor' | 'diff' | 'feedback' | 'compare'>('editor');
  const [data, setData] = useState<ResumeDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [compareData, setCompareData] = useState<ResumeCompareResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // Live Form States
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [suggestedContent, setSuggestedContent] = useState('');

  const [saving, setSaving] = useState(false);
  const [refining, setRefining] = useState(false);

  // Conversational Chat States
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string; suggestedContent?: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);

  async function fetchResume() {
    try {
      const res = await fetch(`/api/resumes/${id}`);
      if (res.ok) {
        const result = (await res.json()) as ResumeDetailResponse;
        setData(result);
        if (result?.resume) {
          setEditingTitle(result.resume.title || '');
          setEditingContent(result.resume.originalContent || '');
          setOriginalContent(result.resume.originalContent || '');
          const latestImproved = result.refinementHistory?.[0]?.improvedContent?.trim() || '';
          setSuggestedContent(latestImproved && latestImproved !== result.resume.originalContent ? latestImproved : '');
        }
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }

  async function fetchComparison(description = jobDescription) {
    setCompareLoading(true);
    setCompareError('');
    const query = description.trim() ? `?jobDescription=${encodeURIComponent(description.trim())}` : '';
    try {
      const res = await fetch(`/api/resumes/${id}/compare${query}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('비교 결과를 불러오지 못했습니다.');
      }
      setCompareData((await res.json()) as ResumeCompareResponse);
    } catch (err: unknown) {
      setCompareError(err instanceof Error ? err.message : '비교 결과를 불러오지 못했습니다.');
    } finally {
      setCompareLoading(false);
    }
  }

  useEffect(() => {
    fetchResume();
  }, [id]);

  useEffect(() => {
    fetchComparison('');
  }, [id]);

  useEffect(() => {
    if (!data?.resume || editingTitle === data.resume.title) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/resumes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: editingTitle }),
        });
        if (res.ok) {
          toast.add({ title: '제목이 자동 저장되었습니다.', color: 'green' });
        }
      } catch {
        // noop
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [editingTitle, data, id, toast]);

  const latestRefinement = useMemo(() => {
    if (!data || !data.refinementHistory) return null;
    return data.refinementHistory[0] || null;
  }, [data]);

  const computedDiffHtml = useMemo(() => {
    return renderDiffHtml(originalContent, suggestedContent);
  }, [originalContent, suggestedContent]);

  async function saveResume() {
    if (!editingTitle || !editingContent) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/resumes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTitle,
          originalContent: editingContent,
        }),
      });
      if (res.ok) {
        setOriginalContent(editingContent);
        setSuggestedContent('');
        toast.add({ title: '이력서 저장 성공', description: '변경 사항이 안전하게 반영되었습니다.', color: 'green' });
        await fetchResume();
        setSuggestedContent('');
        await fetchComparison();
      }
    } catch (err: unknown) {
      toast.add({ title: '저장 실패', description: (err instanceof Error ? err.message : undefined) || '오류가 발생했습니다.', color: 'red' });
    } finally {
      setSaving(false);
    }
  }

  async function triggerRefine() {
    setRefining(true);
    try {
      const res = await fetch(`/api/resumes/${id}/refine`, { method: 'POST' });
      if (res.ok) {
        await fetchResume();
        await fetchComparison();
        setActiveTab('feedback');
        toast.add({ title: 'AI 정밀 평가 완료', description: '최신 평가서 탭을 확인하세요.', color: 'green' });
      }
    } catch (err: unknown) {
      toast.add({ title: '평가 중 오류', description: err instanceof Error ? err.message : undefined, color: 'red' });
    } finally {
      setRefining(false);
    }
  }

  async function sendChatMessage(e: React.FormEvent) {
    e.preventDefault();
    const query = chatMessage.trim();
    if (!query || chatLoading) return;

    const newHistory = [...chatHistory, { role: 'user' as const, content: query }];
    setChatHistory(newHistory);
    setChatMessage('');
    setChatLoading(true);

    try {
      const res = await fetch(`/api/resumes/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          messages: newHistory.slice(0, -1),
          currentContent: editingContent,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/x-ndjson') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantText = '';
        let suggestedContent: string | undefined;

        const upsertAssistant = () => {
          setChatHistory((current) => {
            const next = [...current];
            const last = next[next.length - 1];
            const message = { role: 'assistant' as const, content: assistantText, suggestedContent };
            if (last?.role === 'assistant') next[next.length - 1] = message;
            else next.push(message);
            return next;
          });
        };

        const handleLine = (line: string) => {
          if (!line.trim()) return;
          const event = JSON.parse(line) as ResumeChatStreamEvent;
          if (event.type === 'text') assistantText += event.value || '';
          if (event.type === 'suggestion') suggestedContent = event.value;
          if (event.type === 'text' || event.type === 'suggestion') upsertAssistant();
          if (event.type === 'suggestion_error') toast.add({ title: 'AI 개선 초안 안내', description: event.value, color: 'yellow' });
          if (event.type === 'error') throw new Error(event.value || 'AI 응답을 받지 못했습니다.');
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';
          lines.forEach(handleLine);
        }
        buffer += decoder.decode();
        handleLine(buffer);
      } else {
        const result = (await res.json()) as ChatApiResponse;
        setChatHistory(prev => [
          ...prev,
          {
            role: 'assistant',
            content: result.responseText,
            suggestedContent: result.suggestedContent,
          },
        ]);
      }
    } catch {
      setChatHistory(prev => [
        ...prev,
        { role: 'assistant', content: '대화 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' },
      ]);
      toast.add({ title: '요청 실패', description: 'AI 응답을 받지 못했습니다. 다시 시도해 주세요.', color: 'red' });
    } finally {
      setChatLoading(false);
    }
  }

  function applySuggestedContent(content: string) {
    setSuggestedContent(content);
    setActiveTab('diff');
    toast.add({ title: 'AI 제안 적용', description: '변경된 텍스트가 좌측 비교(Diff) 탭에 기재되었습니다.', color: 'blue' });
  }

  function confirmApply() {
    if (!suggestedContent) return;
    setEditingContent(suggestedContent);
    setSuggestedContent('');
    setActiveTab('editor');
    toast.add({ title: '에디터 본문 반영 완료', description: '반영 사항 저장을 잊지 마세요.', color: 'green' });
  }

  if (loading) {
    return (
      <div className="max-w-[1500px] mx-auto py-8 px-4 space-y-6">
        <div className="space-y-3">
          <div className="skeleton animate-pulse w-24 h-4 rounded" />
          <div className="skeleton animate-pulse w-64 h-8 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="skeleton animate-pulse w-full h-10 rounded-xl" />
              <div className="skeleton animate-pulse w-full h-72 rounded-xl" />
              <div className="skeleton animate-pulse w-44 h-10 rounded-xl" />
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4 h-[60vh] sm:h-[750px]">
              <div className="skeleton animate-pulse w-52 h-5 rounded" />
              <div className="skeleton animate-pulse w-full h-44 rounded-2xl" />
              <div className="skeleton animate-pulse w-full h-44 rounded-2xl" />
              <div className="skeleton animate-pulse w-full h-12 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.resume) {
    return (
      <div className="text-center py-20 text-gray-500">
        이력서를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] mx-auto py-8 px-4 space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <Link href="/resume" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
            ← 목록으로 돌아가기
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{data.resume.title}</h1>
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
              {data.resume.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6 bg-white border border-slate-100 shadow-sm px-6 py-3 rounded-2xl">
          <div className="text-right">
            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">AI 평가 점수</div>
            {data.resume.demo && <div className="text-[10px] font-semibold text-blue-500 mt-0.5">데모 결과</div>}
            {data.resume.currentScore == null ? (
              <div className="text-xl font-bold text-slate-400 mt-0.5">미평가</div>
            ) : (
              <div className="text-3xl font-black text-blue-600 mt-0.5">
                {data.resume.currentScore}<span className="text-xs font-medium text-slate-400 ml-0.5">점</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Panel: Workbench Workspace */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            {/* Tabs */}
            <div role="tablist" aria-label="이력서 작업 탭" className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-1.5 border-b border-slate-100 text-sm">
              <button
                role="tab"
                aria-selected={activeTab === 'editor'}
                onClick={() => setActiveTab('editor')}
                className={`whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-t-lg active:scale-[0.98] ${activeTab === 'editor' ? 'border-b-2 border-blue-600 font-bold text-blue-600 pb-3 -mb-px' : 'text-slate-400 font-semibold hover:text-slate-600 pb-3'}`}
              >
                실시간 편집기
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'diff'}
                onClick={() => setActiveTab('diff')}
                className={`whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-t-lg active:scale-[0.98] ${activeTab === 'diff' ? 'border-b-2 border-blue-600 font-bold text-blue-600 pb-3 -mb-px' : 'text-slate-400 font-semibold hover:text-slate-600 pb-3'}`}
              >
                AI 수정 비교 (Diff)
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'feedback'}
                onClick={() => setActiveTab('feedback')}
                className={`whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-t-lg active:scale-[0.98] ${activeTab === 'feedback' ? 'border-b-2 border-blue-600 font-bold text-blue-600 pb-3 -mb-px' : 'text-slate-400 font-semibold hover:text-slate-600 pb-3'}`}
              >
                AI 종합 평가서
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'compare'}
                onClick={() => setActiveTab('compare')}
                className={`whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-t-lg active:scale-[0.98] ${activeTab === 'compare' ? 'border-b-2 border-blue-600 font-bold text-blue-600 pb-3 -mb-px' : 'text-slate-400 font-semibold hover:text-slate-600 pb-3'}`}
              >
                평균 비교
              </button>
            </div>

            {/* Tab 1: Live Editor */}
            {activeTab === 'editor' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">이력서 제목</label>
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    placeholder="이력서 제목을 적어주세요"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">이력서 본문 (Markdown 작성 지원)</label>
                  <textarea
                    rows={18}
                    value={editingContent}
                    onChange={e => setEditingContent(e.target.value)}
                    placeholder="여기에 경력 사항, 프로젝트 세부 내용, 기술 스택 등을 직접 수정하여 편집하세요..."
                    className="w-full font-mono text-sm leading-relaxed p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 pt-2">
                  <button
                    onClick={saveResume}
                    disabled={saving}
                    className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 px-4 font-semibold text-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {saving && <Spinner className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
                    <span>변경사항 저장</span>
                  </button>
                  <button
                    onClick={triggerRefine}
                    disabled={refining}
                    className="w-full sm:w-auto justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl py-2.5 px-4 font-semibold text-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {refining && <Spinner className="w-3 h-3 border border-slate-600 border-t-transparent rounded-full animate-spin" />}
                    <span>AI 정밀 평가 실행</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Compare/Diff View */}
            {activeTab === 'diff' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">이력서 변경 사항 분석</h3>
                    <p className="text-xs text-slate-400 mt-0.5">이전 저장 버전 대비 단어 수준의 세부 수정 사항을 시각적으로 확인합니다.</p>
                  </div>
                  {suggestedContent && (
                    <button
                      onClick={confirmApply}
                      className="w-full sm:w-auto px-3 py-2 sm:py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      ✓ AI 제안 확정하여 편집기에 적용
                    </button>
                  )}
                </div>

                {suggestedContent ? (
                  <div
                    className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 max-h-[500px] overflow-y-auto leading-relaxed text-sm font-mono whitespace-pre-wrap select-text"
                    dangerouslySetInnerHTML={{ __html: computedDiffHtml }}
                  />
                ) : (
                  <div className="p-12 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                    <div className="text-sm font-semibold">비교</div>
                    <p className="text-xs font-semibold">우측 AI 에이전트와 대화하여 이력서 첨삭을 요청해 보세요.</p>
                    <p className="text-[10px] text-slate-400">AI가 문서를 고치면 변경된 단어들이 여기에 실시간 적녹 색상으로 표시됩니다.</p>
                  </div>
                )}

                {suggestedContent && (
                  <div className="flex gap-4 text-xs font-semibold text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 bg-red-100 rounded" />
                      <span>삭제된 단어</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 bg-green-100 rounded" />
                      <span>추가된 단어</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Detailed Feedback Report */}
            {activeTab === 'feedback' && (
              <div className="space-y-6">
                {latestRefinement ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-bold text-slate-800">최근 실행된 AI 진단 보고서</h3>
                        <p className="text-xs text-slate-400">
                          진단 시각: {new Date(latestRefinement.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-blue-50/50 text-blue-600 px-3 py-1.5 rounded-xl font-black text-sm border border-blue-100">
                        점수: {latestRefinement.score}점
                      </div>
                    </div>

                    {latestRefinement.evaluationFeedback && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl bg-green-50/30 border border-green-100/50 space-y-3">
                          <div className="text-xs font-bold text-green-700 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                            강점 (Strengths)
                          </div>
                          <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                            {latestRefinement.evaluationFeedback.strengths?.map((s: string, idx: number) => (
                              <li key={idx} className="leading-relaxed">{s}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-5 rounded-2xl bg-red-50/30 border border-red-100/50 space-y-3">
                          <div className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                            개선 필요 (Weaknesses)
                          </div>
                          <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                            {latestRefinement.evaluationFeedback.weaknesses?.map((w: string, idx: number) => (
                              <li key={idx} className="leading-relaxed">{w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {latestRefinement.evaluationFeedback?.suggestions && (
                      <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-3">
                        <div className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                          Actionable Suggestions (추천 기재 보강 사항)
                        </div>
                        <ul className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
                          {latestRefinement.evaluationFeedback.suggestions.map((sug: string, idx: number) => (
                            <li key={idx} className="leading-relaxed">{sug}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                   <div className="text-sm font-semibold">평가</div>
                    <p className="text-xs font-semibold">이력서 평가 데이터가 존재하지 않습니다.</p>
                    <p className="text-[10px] text-slate-400">[AI 정밀 평가 실행]을 클릭하여 본문을 최초로 진단해 보세요.</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Privacy-preserving cohort comparison */}
            {activeTab === 'compare' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">익명 기준선과 비교</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      섹션 완성도, 키워드 수, 문장 길이를 집계 기준선과 비교합니다.
                    </p>
                  </div>
                  {compareData && (
                    <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${compareData.baseline.isActual ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                      {compareData.baseline.label}
                    </span>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div>
                    <label htmlFor="compare-job-description" className="block text-xs font-bold text-slate-600">
                      비교할 채용 공고
                    </label>
                    <p className="text-[11px] text-slate-400 mt-1">
                      선택 입력입니다. 입력하면 공고 키워드 기반 매치 휴리스틱을 계산합니다.
                    </p>
                  </div>
                  <textarea
                    id="compare-job-description"
                    value={jobDescription}
                    onChange={event => setJobDescription(event.target.value)}
                    rows={4}
                    placeholder="채용 공고의 요구사항을 붙여 넣으세요."
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fetchComparison()}
                      disabled={compareLoading}
                      className="w-full sm:w-auto rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {compareLoading ? '비교 계산 중' : '기준선과 비교하기'}
                    </button>
                    <span className="text-[10px] text-slate-400">공고 원문은 비교 결과에 저장하거나 표시하지 않습니다.</span>
                  </div>
                </div>

                {compareLoading && !compareData ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[0, 1, 2, 3].map(index => (
                      <div key={index} className="h-24 rounded-2xl skeleton animate-pulse" />
                    ))}
                  </div>
                ) : compareError ? (
                  <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 text-center space-y-3">
                    <p className="text-xs font-semibold text-red-700">{compareError}</p>
                    <button
                      type="button"
                      onClick={() => fetchComparison()}
                      className="rounded-lg bg-white border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                    >
                      다시 시도
                    </button>
                  </div>
                ) : compareData ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: 'sectionCompleteness' as const, label: '섹션 완성도', unit: '점', value: compareData.current.sectionCompleteness.score },
                        { key: 'keywordCount' as const, label: '고유 키워드 수', unit: '개', value: compareData.current.keywordCount },
                        { key: 'sentenceLength' as const, label: '평균 문장 길이', unit: '단어', value: compareData.current.sentenceLength.averageWords },
                        { key: 'jobMatch' as const, label: '공고 매치 휴리스틱', unit: '점', value: compareData.current.jobMatch.score },
                      ].map(metric => {
                        const comparison = compareData.comparisons[metric.key];
                        return (
                          <div key={metric.key} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-600">{metric.label}</span>
                              <span className="text-[10px] text-slate-400">현재</span>
                            </div>
                            <div className="flex items-end justify-between gap-2">
                              <strong className="text-2xl font-black text-slate-900">
                                {metric.value === null ? '미입력' : `${metric.value}`}
                                {metric.value !== null && <span className="ml-1 text-[10px] font-semibold text-slate-400">{metric.unit}</span>}
                              </strong>
                              <span className={`text-[10px] font-bold ${comparison.delta !== null && comparison.delta < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {comparison.delta === null ? '비교 불가' : `기준선 대비 ${comparison.delta > 0 ? '+' : ''}${comparison.delta}`}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              기준선: {comparison.baseline === null ? '미입력' : `${comparison.baseline}${metric.unit}`}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-700">기준선 상태</h4>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {compareData.baseline.isActual ? `익명 표본 ${compareData.baseline.sampleSize}명` : '실제 통계 아님'}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-500">{compareData.baseline.notice}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 space-y-3">
                        <h4 className="text-xs font-bold text-amber-800">약점 및 비교 한계</h4>
                        <ul className="list-disc list-inside space-y-1.5 text-xs leading-relaxed text-slate-600">
                          {compareData.weaknesses.map((weakness, index) => <li key={index}>{weakness}</li>)}
                        </ul>
                      </div>
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                        <h4 className="text-xs font-bold text-blue-800">개선 제안</h4>
                        <ul className="list-disc list-inside space-y-1.5 text-xs leading-relaxed text-slate-600">
                          {compareData.suggestions.map((suggestion, index) => <li key={index}>{suggestion}</li>)}
                        </ul>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-1.5">
                      <h4 className="text-xs font-bold text-slate-700">개인정보 안내</h4>
                      <p className="text-[11px] leading-relaxed text-slate-500">{compareData.privacyNotice}</p>
                      <p className="text-[11px] leading-relaxed text-slate-400">{compareData.disclaimer}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Conversational AI Canvas Agent */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col h-[60vh] sm:h-[750px]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                <h3 className="text-sm font-extrabold text-slate-800">AI 커리어 에이전트 (Canvas)</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Realtime Context Sync</span>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 select-text">
              <div className="text-xs text-center text-slate-400 bg-slate-50/60 p-3 rounded-2xl border border-slate-100/50 leading-relaxed font-semibold">
                안내: 실시간으로 좌측 이력서 본문 맥락이 연계됩니다.<br />
                "React 경력을 추가해줘" 혹은 "성과를 수치화해줘" 라고 대화하세요.
              </div>

              {chatHistory.map((msg, index) => (
                <div key={index} className={`flex flex-col space-y-1.5 ${msg.role === 'assistant' ? 'animate-fade-in-up' : ''}`}>
                  <div
                    className={
                      msg.role === 'user'
                        ? 'self-end bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-[85%] text-xs font-semibold'
                        : 'self-start bg-slate-50 border border-slate-100/50 text-slate-700 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] text-xs leading-relaxed space-y-3'
                    }
                  >
                    <div className="whitespace-pre-wrap font-medium">{msg.content}</div>

                    {msg.suggestedContent && (
                      <div className="mt-2.5 p-3 rounded-xl bg-white border border-slate-100 space-y-2 text-slate-800 shadow-sm shrink-0">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600">
                          AI가 이력서 개선 초안을 생성했습니다.
                        </div>
                        <button
                          onClick={() => applySuggestedContent(msg.suggestedContent!)}
                          className="px-2.5 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          에디터에 적용하기
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex items-center gap-2 self-start bg-slate-50 border border-slate-100/50 text-slate-700 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%]">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[10px] text-slate-400 font-semibold ml-1">AI가 답변을 작성 중입니다...</span>
                </div>
              )}
            </div>

            <form onSubmit={sendChatMessage} className="pt-4 border-t border-slate-100 flex gap-2 shrink-0">
              <input
                type="text"
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                placeholder={chatLoading ? 'AI가 답변을 작성 중입니다...' : 'AI 에디터에게 피드백 요청하기...'}
                disabled={chatLoading}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatMessage.trim()}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs transition-all duration-200 shadow-md hover:shadow-blue-100 flex items-center gap-1.5 disabled:opacity-50 active:scale-[0.98]"
              >
                <span>{chatLoading ? '요청 중…' : '전송'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
