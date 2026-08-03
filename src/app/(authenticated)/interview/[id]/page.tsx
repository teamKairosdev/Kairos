'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useChat } from '@/hooks/useChat';
import { useToast } from '@/lib/toast';
import DifficultyBadge from '@/components/DifficultyBadge';

const interviewTips = [
  { icon: '목표', title: 'STAR 기법 활용', desc: '상황(S), 과제(T), 행동(A), 결과(R) 순서로 답변하세요.' },
  { icon: '시간', title: '답변 시간 조절', desc: '질문당 1~3분 이내로 간결하고 핵심적으로 답변하세요.' },
  { icon: '수치', title: '수치로 증명', desc: '경험과 성과를 구체적인 수치와 데이터로 뒷받침하세요.' },
  { icon: '질문', title: '역질문 준비', desc: '면접 말미에는 회사나 팀에 대한 관심 있는 질문을 해보세요.' },
];

interface InterviewSession {
  id: string;
  userId?: string;
  jobTitle: string;
  companyName?: string | null;
  difficulty?: string;
  status?: string;
  overallScore?: number | null;
  overallFeedback?: string | null;
  createdAt?: string;
  updatedAt?: string;
  messages?: ChatDisplayMessage[];
}

interface ChatDisplayMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts?: Array<{ type: string; text?: string }>;
}

export default function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const interviewId = resolvedParams.id;
  const router = useRouter();
  const toast = useToast();

  const STORAGE_KEY = `interview:${interviewId}`;

  const [mobileTab, setMobileTab] = useState<'chat' | 'info'>('chat');
  const [sessionInfo, setSessionInfo] = useState<InterviewSession | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [showEndModal, setShowEndModal] = useState(false);
  const [endPhase, setEndPhase] = useState<'confirm' | 'summary'>('confirm');
  const [ending, setEnding] = useState(false);
  const isCompleted = sessionInfo?.status === 'completed';

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const msgKeyRef = useRef(new Map<number, string>());

  const { messages, setMessages, input, handleInputChange, handleSubmit, stop, streamStarted, isLoading: isStreaming } = useChat({
    api: `/api/interviews/${interviewId}/chat`,
    onError: (err) => {
      toast.add({ title: '오류 발생', description: err.message, color: 'red' });
    },
    onFinish: () => {
      scrollToBottom();
    },
  });

  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved)) {
        const valid = saved.filter(
          (m: ChatDisplayMessage) =>
            m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string' &&
            m.content.trim()
        );
        if (valid.length > 0) {
          setMessages(valid);
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          }, 50);
        }
      }
    } catch {
      // noop
    }
  }, [interviewId, setMessages]);

  useEffect(() => {
    function backup() {
      try {
        const persisted = messagesRef.current.filter(
          (m) => m.role !== 'system' && m.content.trim()
        );
        if (persisted.length > 0) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // noop
      }
    }
    window.addEventListener('beforeunload', backup);
    return () => {
      backup();
      window.removeEventListener('beforeunload', backup);
    };
  }, [STORAGE_KEY]);

  function messageKey(idx: number) {
    let key = msgKeyRef.current.get(idx);
    if (!key) {
      key =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${idx}`;
      msgKeyRef.current.set(idx, key);
    }
    return key;
  }

  function openEndModal() {
    if (isCompleted) return;
    setEndPhase('confirm');
    setShowEndModal(true);
  }

  async function confirmEndInterview() {
    if (ending || isCompleted) return;
    stop();
    setEnding(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!res.ok) throw new Error(`면접 종료 저장 실패 (${res.status})`);

      setSessionInfo((current) => current ? { ...current, status: 'completed' } : current);
      setEndPhase('summary');
      setTimeout(() => {
        setShowEndModal(false);
        router.push('/interview');
      }, 2500);
    } catch (err: unknown) {
      setEnding(false);
      toast.add({
        title: '면접 종료 저장 실패',
        description: err instanceof Error ? err.message : '잠시 후 다시 시도해주세요.',
        color: 'red',
      });
    }
  }

  function closeEndModal() {
    setShowEndModal(false);
  }

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/interviews/${interviewId}`);
        if (res.ok) {
          const data = (await res.json()) as InterviewSession;
          setSessionInfo(data);
          const apiMessages = Array.isArray(data.messages)
            ? data.messages.filter(
                (message) =>
                  message &&
                  (message.role === 'user' || message.role === 'assistant') &&
                  typeof message.content === 'string' &&
                  message.content.trim()
              )
            : [];
          if (apiMessages.length > 0) {
            setMessages((current) => current.length > 0 ? current : apiMessages);
          }
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

  function getMessageText(msg: ChatDisplayMessage): string {
    if (typeof msg.content === 'string') return msg.content;
    if (Array.isArray(msg.parts)) {
      return msg.parts
        .filter((p) => p.type === 'text')
        .map((p) => p.text || '')
        .join('');
    }
    return '';
  }

  const questionCount = messages.filter(m => m.role === 'assistant').length;

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
           면접 진행
        </button>
        <button
          onClick={() => setMobileTab('info')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            mobileTab === 'info' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400'
          }`}
        >
           세션 정보
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
            <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-gray-400' : isStreaming ? 'animate-pulse bg-amber-400' : 'animate-pulse bg-emerald-400'}`} />
            <span className={`text-xs font-medium ${isCompleted ? 'text-gray-500' : isStreaming ? 'text-amber-600' : 'text-emerald-600'}`}>
              {isCompleted ? '면접 종료' : isStreaming ? 'AI 응답 중' : '대기 중'}
            </span>
          </div>
          <h1 className="text-base font-bold text-gray-900">{sessionInfo?.jobTitle || 'AI 모의 면접'}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{sessionInfo?.companyName || '일반 면접'}</p>
        </div>

        <div className="p-5 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">면접 유형</span>
            <DifficultyBadge difficulty={sessionInfo?.difficulty} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">진행 단계</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              sessionInfo?.status === 'completed'
                ? 'bg-green-50 text-green-600'
                : 'bg-blue-50 text-blue-600'
            }`}>
              {sessionInfo?.status === 'completed' ? '완료' : '진행중'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">질문 진행</span>
            <span className="text-xs font-bold text-gray-900">
              {questionCount > 0 ? `${questionCount}번째 질문` : '아직 시작 전'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">주고받은 메시지</span>
            <span className="text-xs font-bold text-gray-900">{messages.length}개</span>
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
          {!isCompleted && (
            <button
              onClick={openEndModal}
              className="w-full py-3 min-h-[44px] rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all active:scale-[0.98]"
            >
              면접 종료
            </button>
          )}
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
            <p className={`text-xs font-medium ${isCompleted ? 'text-gray-400' : 'text-emerald-500'}`}>
              {isCompleted ? '종료된 면접' : '온라인 · 실시간 평가 중'}
            </p>
          </div>
          {!isCompleted && (
            <button
              onClick={openEndModal}
              className="ml-auto shrink-0 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-200 active:scale-[0.98]"
            >
              면접 종료
            </button>
          )}
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
          {messages.map((msg, idx) => (
            <div key={messageKey(idx)} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
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
              <div className="max-w-[75%] min-w-0 space-y-1">
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed break-words ${
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

          {isStreaming && !streamStarted && (
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
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-white">
          <form
            onSubmit={(event) => {
              if (isCompleted) {
                event.preventDefault();
                return;
              }
              handleSubmit(event);
            }}
            className="flex items-end gap-2 sm:gap-3 bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder={isCompleted ? '종료된 면접입니다.' : isStreaming ? 'AI 면접관이 답변을 작성 중입니다...' : '답변을 입력하세요... (Shift+Enter로 줄바꿈)'}
              rows={1}
              disabled={isStreaming || isCompleted}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isCompleted) handleSubmit(e);
                }
              }}
              className="flex-1 min-w-0 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none max-h-32 leading-relaxed disabled:cursor-not-allowed"
            />
            {isStreaming && (
              <button
                type="button"
                onClick={stop}
                className="shrink-0 h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200 active:scale-[0.98]"
              >
                 생성 중지
              </button>
            )}
            <button
              type="submit"
              disabled={isStreaming || isCompleted || !input.trim()}
              className="shrink-0 w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40"
            >
              ➔
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2 text-center">Enter로 전송 · Shift+Enter로 줄바꿈</p>
        </div>
      </div>

      {/* End Interview Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-lift w-full max-w-md p-6 space-y-5 animate-fade-in-up">
            {endPhase === 'confirm' ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center text-xs font-semibold mx-auto">종료</div>
                <div className="text-center space-y-1.5">
                  <h3 className="text-lg font-bold text-gray-900">정말 종료할까요?</h3>
                  <p className="text-sm text-gray-500">
                    {questionCount > 0
                      ? `현재 ${questionCount}번째 질문 · 지금까지 ${messages.length}개의 메시지를 주고받았습니다.`
                      : '아직 질문이 시작되지 않았습니다.'}
                  </p>
                  <p className="text-xs text-gray-400">종료하면 대화 내용이 저장되고 면접 목록으로 이동합니다.</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={closeEndModal}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors active:scale-[0.98]"
                  >
                    계속하기
                  </button>
                  <button
                    onClick={confirmEndInterview}
                    disabled={ending}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors active:scale-[0.98]"
                  >
                    {ending ? '저장 중...' : '면접 종료'}
                  </button>
                </div>
              </>
            ) : (
              <>
                 <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-semibold mx-auto">완료</div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900">면접이 종료되었습니다</h3>
                  <p className="text-sm text-gray-500 mt-1">지금까지의 면접 요약입니다.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-extrabold text-gray-900">{messages.length}</div>
                    <div className="text-xs text-gray-400 mt-0.5 font-medium">주고받은 메시지</div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-extrabold text-gray-900">{questionCount}</div>
                    <div className="text-xs text-gray-400 mt-0.5 font-medium">진행된 질문</div>
                  </div>
                </div>
                <p className="text-center text-xs text-gray-400">잠시 후 면접 목록으로 이동합니다...</p>
                <button
                  onClick={() => {
                    setShowEndModal(false);
                    router.push('/interview');
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98]"
                >
                  면접 목록으로 이동
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
