'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface SharedMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SharedChat {
  title: string;
  messages: SharedMessage[];
  createdAt?: string;
  userId?: string | null;
  isDemo?: boolean;
}

const demoChat: SharedChat = {
  title: '공유된 AI 커리어 대화',
  isDemo: true,
  messages: [
    { role: 'assistant', content: '안녕하세요! 공유된 Kairos AI 커리어 대화 내역입니다.' },
    { role: 'user', content: '이력서의 정량적 성과 작성 팁을 알려주세요.' },
    {
      role: 'assistant',
      content:
        'STAR 기법(Situation, Task, Action, Result)을 활용하여 구체적인 지표(예: 지연 시간 25% 단축)를 명시하는 것이 중요합니다.',
    },
  ],
};

function formatDate(value?: string) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

export default function SharedChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [chatData, setChatData] = useState<SharedChat | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [copied, setCopied] = useState(false);

  const router = useRouter();

  const loadChat = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/chat/${id}`);
      if (res.ok) {
        const data = await res.json();
        setChatData({
          title: data.title || '공유된 AI 커리어 대화',
          messages: Array.isArray(data.messages) ? data.messages : [],
          createdAt: data.createdAt,
          userId: data.userId,
        });
      } else {
        setLoadError(true);
        setChatData(null);
        toast.error('공유된 대화를 찾을 수 없습니다: 만료되었거나 유효하지 않은 링크입니다.');
      }
    } catch {
      setLoadError(true);
      setChatData(null);
      toast.error('대화를 불러오지 못했습니다: 네트워크 상태를 확인하고 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id.startsWith('demo-')) {
      setChatData({ ...demoChat, createdAt: undefined });
      setLoading(false);
      return;
    }
    loadChat();
  }, [id, loadChat]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('공유 링크가 복사되었습니다');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('링크 복사에 실패했습니다: 브라우저 권한을 확인해주세요.');
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="skeleton h-3 w-24 mb-3" />
          <div className="skeleton h-6 w-2/3 mb-4" />
          <div className="flex items-center gap-3">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-8 w-24 rounded-lg" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={i % 2 === 0 ? 'pr-10' : 'pl-10'}>
              <div className="skeleton h-4 w-20 mb-2" />
              <div className="skeleton h-16 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loadError || !chatData) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-3xl border border-gray-100 bg-white shadow-card p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-2xl">
            🔍
          </div>
          <h1 className="text-lg font-bold text-gray-900">공유된 대화를 찾을 수 없습니다</h1>
          <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
            링크가 만료되었거나 존재하지 않는 공유 세션입니다. 공유한 사람에게 새로운 링크를 요청해주세요.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <button
              onClick={loadChat}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-md shadow-blue-600/20 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:outline-none"
            >
              다시 시도
            </button>
            <button
              onClick={() => router.back()}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:outline-none"
            >
              뒤로 가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const createdAt = formatDate(chatData.createdAt);
  const creatorId = chatData.userId ? `#${chatData.userId.slice(0, 8)}` : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up motion-reduce:animate-none">
      <div className="rounded-3xl border border-gray-100 bg-white shadow-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">공유된 채팅</span>
              {chatData.isDemo && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                  미리보기
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 break-words">{chatData.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 font-medium">
              {createdAt && <span>생성일: {createdAt}</span>}
              {creatorId && <span>작성자 {creatorId}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-xs font-semibold hover:bg-gray-50 hover:text-gray-900 active:scale-[0.98] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:outline-none"
            >
              {copied ? '✓ 복사됨' : '링크 복사'}
            </button>
            <Link
              href="/"
              className="px-3.5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-md shadow-blue-600/20 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:outline-none"
            >
              Kairos 시작하기
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white shadow-card p-4 sm:p-6 space-y-4">
        {chatData.messages.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">표시할 대화 내용이 없습니다.</p>
        ) : (
          chatData.messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md ml-8'
                    : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-bl-md mr-8'
                }`}
              >
                <div className={`font-semibold text-xs mb-1.5 ${m.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                  {m.role === 'user' ? '👤 지원자' : '🤖 Kairos AI'}
                </div>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
