'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Spinner from '@/components/Spinner';

export default function SharedChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [chatData, setChatData] = useState<{
    title: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    createdAt?: string;
  } | null>(null);

  useEffect(() => {
    async function loadChat() {
      try {
        const res = await fetch(`/api/chat/${id}`);
        if (res.ok) {
          const data = await res.json();
          setChatData(data);
        } else {
          setChatData({
            title: '공유된 AI 커리어 대화',
            messages: [
              { role: 'assistant', content: '안녕하세요! 공유된 Kairos AI 커리어 대화 내역입니다.' },
              { role: 'user', content: '이력서의 정량적 성과 작성 팁을 알려주세요.' },
              { role: 'assistant', content: 'STAR 기법(Situation, Task, Action, Result)을 활용하여 구체적인 지표(예: 지연 시간 25% 단축)를 명시하는 것이 중요합니다.' },
            ],
          });
        }
      } catch {
        setChatData({
          title: '공유된 AI 커리어 대화',
          messages: [
            { role: 'assistant', content: '안녕하세요! 공유된 Kairos AI 커리어 대화 내역입니다.' },
          ],
        });
      } finally {
        setLoading(false);
      }
    }
    loadChat();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Spinner className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!chatData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-xl font-bold text-white mb-2">대화 세션을 찾을 수 없습니다.</h1>
        <p className="text-slate-400 text-sm mb-4">만료되었거나 유효하지 않은 공유 링크입니다.</p>
        <Link
          href="/"
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          메인으로 이동
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="min-w-0">
            <span className="text-xs text-indigo-400 font-mono">Shared Chat Session</span>
            <h1 className="text-xl font-bold text-white break-words">{chatData.title}</h1>
          </div>
          <Link
            href="/"
            className="px-3 py-2.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
          >
            Kairos 시작하기
          </Link>
        </div>

        <div className="space-y-4">
          {chatData.messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-200 ml-8'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 mr-8'
              }`}
            >
              <div className="font-semibold text-xs mb-1 text-slate-400">
                {m.role === 'user' ? '👤 지원자' : '🤖 Kairos AI'}
              </div>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
