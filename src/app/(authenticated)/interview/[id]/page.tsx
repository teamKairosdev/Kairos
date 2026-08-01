'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useChat } from '@/hooks/useChat';
import { useToast } from '@/lib/toast';

export default function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const interviewId = resolvedParams.id;
  const router = useRouter();
  const toast = useToast();

  const [mobileTab, setMobileTab] = useState<'chat' | 'info'>('chat');
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading: isStreaming } = useChat({
    api: `/api/interviews/${interviewId}/chat`,
    onError: (err) => {
      toast.add({ title: '오류 발생', description: err.message, color: 'red' });
    },
    onFinish: () => {
      scrollToBottom();
    },
  });

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/interviews/${interviewId}`);
        if (res.ok) {
          const data = await res.json();
          setSessionInfo(data);
        }
      } catch {}
    }
    fetchSession();
  }, [interviewId]);

  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      setElapsedTime(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function scrollToBottom() {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 50);
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function getMessageText(msg: any): string {
    if (typeof msg.content === 'string') return msg.content;
    if (Array.isArray(msg.parts)) {
      return msg.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text || '')
        .join('');
    }
    return '';
  }

  function difficultyLabel(d?: string) {
    return { junior: '🌱 주니어', medium: '⚡ 미들', senior: '🔥 시니어' }[d || ''] || d || '-';
  }
  function difficultyBadge(d?: string) {
    return (
      {
        junior: 'bg-green-50 text-green-700',
        medium: 'bg-blue-50 text-blue-700',
        senior: 'bg-red-50 text-red-700',
      }[d || ''] || 'bg-gray-100 text-gray-600'
    );
  }

  const questionCount = messages.filter(m => m.role === 'assistant').length;

  const interviewTips = [
    { icon: '🎯', title: 'STAR 기법 활용', desc: '상황(S), 과제(T), 행동(A), 결과(R) 순서로 답변하세요.' },
    { icon: '⏱️', title: '답변 시간 조절', desc: '질문당 1~3분 이내로 간결하고 핵심적으로 답변하세요.' },
    { icon: '📊', title: '수치로 증명', desc: '경험과 성과를 구체적인 수치와 데이터로 뒷받침하세요.' },
    { icon: '🔍', title: '역질문 준비', desc: '면접 말미에는 회사나 팀에 대한 관심 있는 질문을 해보세요.' },
  ];

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-80px)] gap-0 overflow-hidden rounded-none lg:rounded-2xl border-0 lg:border border-gray-100 shadow-none lg:shadow-sm bg-white">
      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex border-b border-gray-100 bg-white mb-0">
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            mobileTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400'
          }`}
        >
          💬 면접 진행
        </button>
        <button
          onClick={() => setMobileTab('info')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            mobileTab === 'info' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400'
          }`}
        >
          📋 세션 정보
        </button>
      </div>

      {/* Left Panel: Info & Guide */}
      <div
        className={`shrink-0 border-r border-gray-100 bg-gray-50/60 flex-col lg:w-72 xl:w-80 ${
          mobileTab === 'info' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        <div className="p-5 border-b border-gray-100">
          <Link href="/interview" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-3">
            ← 목록으로
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isStreaming ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span className={`text-xs font-medium ${isStreaming ? 'text-amber-600' : 'text-emerald-600'}`}>
              {isStreaming ? 'AI 응답 중' : '대기 중'}
            </span>
          </div>
          <h1 className="text-base font-bold text-gray-900">{sessionInfo?.jobTitle || 'AI 모의 면접'}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{sessionInfo?.companyName || '일반 면접'}</p>
        </div>

        <div className="p-5 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">난이도</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${difficultyBadge(sessionInfo?.difficulty)}`}>
              {difficultyLabel(sessionInfo?.difficulty)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">질문 수</span>
            <span className="text-xs font-bold text-gray-900">{questionCount}번째</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">경과 시간</span>
            <span className="text-xs font-bold text-gray-900 font-mono">{elapsedTime}</span>
          </div>
        </div>

        <div className="flex-1 p-5 overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">면접 팁</h3>
          <ul className="space-y-3">
            {interviewTips.map(tip => (
              <li key={tip.title} className="flex gap-2.5">
                <span className="text-base shrink-0 mt-0.5">{tip.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-gray-700">{tip.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{tip.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 border-t border-gray-100">
          <button
            onClick={() => router.push('/interview')}
            className="w-full py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
          >
            면접 종료
          </button>
        </div>
      </div>

      {/* Right Panel: Chat */}
      <div className={`flex-1 flex-col min-w-0 bg-white ${mobileTab === 'info' ? 'hidden lg:flex' : 'flex'}`}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
            AI
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Kairos AI 면접관</p>
            <p className="text-xs text-emerald-500 font-medium">온라인 · 실시간 평가 중</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className="shrink-0">
                {msg.role === 'assistant' ? (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    AI
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold">
                    나
                  </div>
                )}
              </div>
              <div className="max-w-[75%] space-y-1">
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gray-900 text-white rounded-tr-sm'
                      : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
                  }`}
                >
                  <span className="whitespace-pre-wrap">{getMessageText(msg)}</span>
                </div>
              </div>
            </div>
          ))}

          {isStreaming && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                AI
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm rounded-tl-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white">
          <form onSubmit={handleSubmit} className="flex items-end gap-3 bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder="답변을 입력하세요... (Shift+Enter로 줄바꿈)"
              rows={1}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none max-h-32 leading-relaxed"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="shrink-0 w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40"
            >
              ➔
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2 text-center">Enter로 전송 · Shift+Enter로 줄바꿈</p>
        </div>
      </div>
    </div>
  );
}
