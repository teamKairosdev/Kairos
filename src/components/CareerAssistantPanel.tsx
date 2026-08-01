'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ThinkingBubble from './ThinkingBubble';

export default function CareerAssistantPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string; diffSuggested?: string }>
  >([
    {
      role: 'assistant',
      content:
        '안녕하세요! Kairos AI 커리어 비서입니다. 이력서 튜닝, 면접 질문 준비, JD 성과 도출 등 무엇이든 질문해주세요.',
    },
  ]);

  const [thinkingState, setThinkingState] = useState<{
    active: boolean;
    step: number;
    totalSteps: number;
    stepTitle: string;
    thinkingDetails?: string;
  }>({
    active: false,
    step: 1,
    totalSteps: 3,
    stepTitle: 'AI 커리어 전략 검색 중...',
  });

  const [savedChatUrl, setSavedChatUrl] = useState<string | null>(null);
  const [savingChat, setSavingChat] = useState(false);

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const query = inputQuery.trim();
    if (!query) return;

    const userMsg = { role: 'user' as const, content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');

    setThinkingState({
      active: true,
      step: 1,
      totalSteps: 3,
      stepTitle: '1단계: 백엔드/스택 데이터 시맨틱 파싱 중...',
      thinkingDetails: `[입력 쿼리 분석]: "${query}"`,
    });

    await new Promise((r) => setTimeout(r, 600));

    setThinkingState({
      active: true,
      step: 2,
      totalSteps: 3,
      stepTitle: '2단계: LLM 인프라 패턴 정량적 성과 매핑...',
      thinkingDetails: `STAR 기법 및 ATS 핵심 기술 키워드 추출 중`,
    });

    await new Promise((r) => setTimeout(r, 600));

    setThinkingState({
      active: true,
      step: 3,
      totalSteps: 3,
      stepTitle: '3단계: 최적의 커리어 가이드 생성 중...',
    });

    await new Promise((r) => setTimeout(r, 400));

    setThinkingState((prev) => ({ ...prev, active: false }));

    const lower = query.toLowerCase();
    let responseText =
      '질문하신 내용에 대한 커리어 가이드입니다. 프로젝트의 기여도와 성과를 숫자로 측정하여 서술해 보세요.';
    let diffSuggested: string | undefined;

    if (lower.includes('이력서') || lower.includes('경력')) {
      responseText =
        '이력서 항목의 영향력을 강화하기 위한 제안입니다. 단순 기능 개발 목록에서 탈피하여 비즈니스 수치를 강조하세요.';
      diffSuggested =
        '\n\n- [AI 제안] 대용량 트래픽 처리 아키텍처 재설계를 통해 P99 지연 시간 350ms → 80ms로 77% 단축 및 인프라 비용 월 120만원 절감.';
    }

    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: responseText, diffSuggested },
    ]);
  }

  async function handleSaveChat() {
    setSavingChat(true);
    try {
      const res = await fetch('/api/chat/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: messages[1]?.content.slice(0, 20) || 'AI 커리어 질의응답',
          messages,
        }),
      });
      const data = await res.json();
      if (data.url) setSavedChatUrl(data.url);
    } catch {
      setSavedChatUrl(`/r/demo-${Date.now()}`);
    } finally {
      setSavingChat(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-lg shadow-indigo-500/30 hover:scale-105 transition-all font-medium text-sm border border-indigo-400/30"
      >
        <span className="text-base">🤖</span>
        <span>AI 커리어 패널</span>
      </button>
    );
  }

  return (
    <aside className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] h-[520px] bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="p-3.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <h3 className="text-sm font-semibold text-white leading-none">Kairos AI 어시스턴트</h3>
            <p className="text-[10px] text-indigo-400 font-mono mt-0.5">Career Guidance Engine</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white text-lg p-1 rounded-lg hover:bg-slate-700/50"
        >
          ✕
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto text-xs">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-xl leading-relaxed ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-slate-800/90 border border-slate-700/60 text-slate-200 rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.diffSuggested && (
                <div className="mt-2 pt-2 border-t border-slate-700/60 text-[11px] font-mono text-emerald-400 bg-emerald-950/30 p-2 rounded">
                  {m.diffSuggested}
                </div>
              )}
            </div>
          </div>
        ))}

        <ThinkingBubble
          active={thinkingState.active}
          step={thinkingState.step}
          totalSteps={thinkingState.totalSteps}
          stepTitle={thinkingState.stepTitle}
          thinkingDetails={thinkingState.thinkingDetails}
        />
      </div>

      {/* Footer / Input */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90 space-y-2">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="질문을 입력하세요..."
            disabled={thinkingState.active}
            className="flex-1 px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={thinkingState.active}
            className="px-3 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            전송
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px]">
          <button
            onClick={handleSaveChat}
            disabled={savingChat || messages.length <= 1}
            className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40"
          >
            {savingChat ? '저장 중...' : '🔗 공유 가능 링크 생성'}
          </button>
          {savedChatUrl && (
            <span className="text-emerald-400 font-mono">
              [저장됨:{' '}
              <Link href={savedChatUrl} target="_blank" className="underline">
                링크 이동
              </Link>
              ]
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
