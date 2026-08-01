'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/toast';

export default function InterviewListPage() {
  const toast = useToast();
  const router = useRouter();

  const [interviews, setInterviews] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [loading, setLoading] = useState(false);

  const difficulties = [
    { label: '주니어', value: 'junior' },
    { label: '미들', value: 'medium' },
    { label: '시니어', value: 'senior' },
  ];

  async function fetchInterviews() {
    try {
      const res = await fetch('/api/interviews');
      if (res.ok) {
        const data = await res.json();
        setInterviews(data || []);
      }
    } catch {
      // fallback
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    fetchInterviews();
  }, []);

  async function createInterview() {
    if (!jobTitle.trim()) {
      toast.add({ title: '직무를 입력해주세요.', color: 'red' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle, companyName, difficulty }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/interview/${data.id}`);
      } else {
        toast.add({ title: '면접 생성 실패', color: 'red' });
      }
    } catch (err: any) {
      toast.add({ title: '오류 발생', description: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  }

  const difficultyLabel = (d: string) => {
    const map: Record<string, string> = { junior: '주니어', medium: '미들', senior: '시니어' };
    return map[d] || d;
  };

  const statusLabel = (s: string) => {
    return s === 'completed' ? '완료' : '진행중';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">AI Mock Interview</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">모의 면접</h1>
          <p className="text-sm text-gray-500 mt-1">AI 면접관과 실전 면접을 연습하세요</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-100"
        >
          + 새 면접 시작
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '전체 면접', value: interviews.length },
          { label: '완료', value: interviews.filter(i => i.status === 'completed').length },
          { label: '평균 점수', value: interviews.filter(i => i.overallScore).length > 0 ? Math.round(interviews.filter(i => i.overallScore).reduce((acc, i) => acc + i.overallScore, 0) / interviews.filter(i => i.overallScore).length) + '점' : '-' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 text-center">
            <div className="text-2xl font-extrabold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-400 font-medium mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Interview List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">면접 이력</h2>
          <span className="text-xs text-gray-400">{interviews.length}개</span>
        </div>

        {loadingList ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : interviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl">🎤</div>
            <p className="text-sm font-medium text-gray-600">아직 면접 이력이 없습니다</p>
            <p className="text-xs text-gray-400">상단의 버튼을 눌러 첫 번째 모의 면접을 시작해보세요</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {interviews.map(interview => (
              <Link
                key={interview.id}
                href={`/interview/${interview.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 font-bold text-sm flex-shrink-0">
                    {interview.jobTitle?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {interview.jobTitle}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {interview.companyName && `${interview.companyName} · `}
                      {difficultyLabel(interview.difficulty)} · {new Date(interview.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {interview.overallScore && (
                    <span className="text-sm font-bold text-blue-600">{interview.overallScore}점</span>
                  )}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    interview.status === 'completed'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-amber-50 text-amber-600'
                  }`}>
                    {statusLabel(interview.status)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/80 w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">새 면접 시작</h2>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">지원 직무 *</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder="예: 백엔드 개발자"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">회사명 (선택)</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="예: 카카오"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">난이도</label>
                <div className="grid grid-cols-3 gap-2">
                  {difficulties.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setDifficulty(d.value)}
                      className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        difficulty === d.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={createInterview}
                disabled={loading || !jobTitle.trim()}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {loading ? '생성중...' : '시작하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
