'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { state, login } = useAuth();
  const router = useRouter();

  const hours = new Date().getHours();
  const greetingMessage =
    hours < 12
      ? '좋은 아침입니다. 오늘의 목표를 설정해보세요.'
      : hours < 18
      ? '좋은 오후입니다. 커리어를 한 단계 발전시킬 시간입니다.'
      : '좋은 저녁입니다. 내일을 위한 준비를 해보세요.';

  // Interactive mouse effect states
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent) {
    if (typeof window === 'undefined') return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    setMousePos({
      x: (e.clientX / width) * 2 - 1,
      y: (e.clientY / height) * 2 - 1,
    });
  }

  // Bento 1: Resume Enhancer Slider State
  const [evalSliderScore, setEvalSliderScore] = useState(35);
  const sliderPercentage = evalSliderScore;

  const sliderColorClass = useMemo(() => {
    if (evalSliderScore > 85) return 'text-emerald-500';
    if (evalSliderScore > 60) return 'text-blue-500';
    return 'text-red-500';
  }, [evalSliderScore]);

  const sliderText = useMemo(() => {
    if (evalSliderScore < 55) {
      return '카카오에서 리액트 개발을 주로 하였습니다. 버그를 많이 수정했습니다.';
    } else if (evalSliderScore < 85) {
      return '카카오 프론트엔드 파트에서 결제 서비스 리팩토링 및 쿼리 캐싱 패턴 도입 담당.';
    } else {
      return '카카오 페이먼트 서비스 리액트 마이그레이션 주도 (결제 실패율 2.3%에서 0.05% 이하 통제, LCP 4.2s에서 1.1s 개선 완료)';
    }
  }, [evalSliderScore]);

  // Bento 2: ATS Chips
  const jdChips = [
    { name: 'React', matched: true },
    { name: 'TypeScript', matched: true },
    { name: 'Next.js', matched: true },
    { name: 'Terraform', matched: false },
    { name: 'TailwindCSS', matched: true },
    { name: 'Kubernetes', matched: false },
  ];

  // Bento 3: Mock Interview Chat States
  const [activeInterviewQuestion, setActiveInterviewQuestion] = useState(
    '반갑습니다. 준비하신 프로젝트 성과에 대해 간략히 두 문장으로 대답해 주십시오.'
  );

  const interviewAnswers = [
    {
      label: '리액트 성능을 주로 개선했습니다.',
      response: '어떤 기법(예: 메모이제이션, 코드 스플리팅)을 사용해 LCP 지연을 단축하셨습니까?',
    },
    {
      label: 'MSA 결제 아키텍처를 도입했습니다.',
      response: '결제 트랜잭션 중 발생 가능한 동시성(Race Condition) 문제를 어떻게 보완하셨는지 공유해주세요.',
    },
  ];

  // Bento 4: Vector Search
  const [vectorSearchQuery, setVectorSearchQuery] = useState('');
  const [vectorResults, setVectorResults] = useState([
    { company: '토스', role: '프론트엔드 개발자', similarity: 96 },
    { company: '네이버', role: '백엔드 엔지니어', similarity: 82 },
  ]);

  function triggerVectorSearch() {
    if (!vectorSearchQuery.trim()) return;
    setVectorResults([
      { company: '카카오', role: '플랫폼 엔지니어', similarity: Math.floor(Math.random() * 15) + 85 },
      { company: '라인', role: '서버 아키텍트', similarity: Math.floor(Math.random() * 20) + 70 },
    ]);
  }

  async function fillMockCredentials() {
    const success = await login('testmockup', '12345');
    if (success) {
      router.push('/');
    }
  }

  const stats = [
    { value: '50개', label: '직무 매칭 데이터' },
    { value: '1536차원', label: '임베딩 차원' },
    { value: '98%', label: 'AI 피드백 정확도' },
    { value: '실시간', label: '스트리밍 면접관' },
  ];

  const dashboardStats = [
    { label: '이력서', value: '-', to: '/resume', trend: 'AI 고도화 시작하기', trendPositive: true },
    { label: '모의 면접', value: '-', to: '/interview', trend: '첫 면접 시작하기', trendPositive: true },
    { label: 'ATS 분석', value: '-', to: '/ats', trend: 'JD 매칭 분석', trendPositive: true },
    { label: '경력 관리', value: '-', to: '/career', trend: '벡터 검색', trendPositive: false },
  ];

  const activities = [
    { label: '이력서를 작성해보세요', time: '추천', desc: 'AI가 초안부터 평가, 첨삭까지 도와줍니다.', to: '/resume', dotClass: 'bg-blue-600' },
    { label: 'AI 면접을 연습해보세요', time: '추천', desc: '직무별 맞춤 질문과 실시간 피드백', to: '/interview', dotClass: 'bg-blue-600' },
    { label: 'ATS 매칭 점수를 확인하세요', time: '추천', desc: 'JD 기반 키워드 분석으로 부족한 역량 진단', to: '/ats', dotClass: 'bg-blue-600' },
    { label: '문서를 업로드하고 관리하세요', time: '추천', desc: 'HWP, PDF, DOCX 파일 중앙 관리', to: '/docs', dotClass: 'bg-blue-600' },
  ];

  const quickLinks = [
    { label: '이력서 관리', icon: '📄', to: '/resume' },
    { label: '면접 연습', icon: '🎤', to: '/interview' },
    { label: 'ATS 진단', icon: '🎯', to: '/ats' },
    { label: '문서 보관함', icon: '📁', to: '/docs' },
    { label: '포토스튜디오', icon: '🎨', to: '/studio' },
    { label: '설정', icon: '⚙️', to: '/settings' },
  ];

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-400">시스템 로딩 중...</p>
        </div>
      </div>
    );
  }

  // Dashboard (Authenticated)
  if (state.authenticated) {
    return (
      <div className="space-y-8 pb-16">
        {/* Welcome Banner */}
        <div className="rounded-2xl border border-blue-100/50 p-8 bg-gradient-to-r from-blue-50/40 via-blue-50/20 to-white shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {state.user?.name}님, 반갑습니다 👋
              </h1>
              <p className="text-sm font-medium text-slate-400 leading-relaxed">{greetingMessage}</p>
            </div>
            <Link
              href="/interview"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 hover:shadow-md transition-all duration-200"
            >
              <span>🎤</span>
              <span>모의 면접 바로가기</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {dashboardStats.map(stat => (
            <Link
              key={stat.label}
              href={stat.to}
              className="rounded-2xl border border-slate-100 p-5 bg-white shadow-sm hover:border-blue-200 hover:shadow-md transition-all duration-200 group"
            >
              <p className="text-xs font-semibold text-slate-400">{stat.label}</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-2">{stat.value}</p>
              {stat.trend && (
                <p className="text-xs mt-3 font-semibold flex items-center gap-1 text-blue-600">
                  <span>✨</span>
                  <span>{stat.trend}</span>
                </p>
              )}
            </Link>
          ))}
        </div>

        {/* Main Feed + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/* Left Feed */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">추천 커리어 과제</h2>
              <Link href="/settings" className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition-colors">
                자세히 보기
              </Link>
            </div>
            <div className="space-y-6">
              {activities.map((activity, i) => (
                <div key={i} className="relative flex gap-5">
                  {i < activities.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-[-24px] w-0.5 bg-slate-100" />
                  )}
                  <div className="w-8 h-8 rounded-full border border-blue-100 bg-blue-50 flex items-center justify-center shrink-0 z-10">
                    <div className={`w-2.5 h-2.5 rounded-full ${activity.dotClass}`} />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-700">{activity.label}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-blue-50 text-blue-600">
                        {activity.time}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-400 leading-relaxed">{activity.desc}</p>
                    <Link
                      href={activity.to}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-block"
                    >
                      진행하기 &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Menu */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider mb-4 uppercase">바로가기 메뉴</h3>
              <nav className="space-y-1">
                {quickLinks.map(item => (
                  <Link
                    key={item.label}
                    href={item.to}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all duration-200"
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>

            <div className="rounded-2xl border border-blue-50 p-6 bg-gradient-to-br from-blue-50/20 via-blue-50/10 to-white shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 shadow-sm text-blue-600">
                  💡
                </div>
                <h3 className="text-sm font-bold text-slate-800">커리어 가이드 팁</h3>
              </div>
              <p className="text-xs font-medium text-slate-400 leading-relaxed">
                이력서에 지원하려는 구체적 포지션의 핵심 키워드를 최적화해 포함시키면 AI 필터링 서류 평가 점수가 평균 23% 상승합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Landing Page (Unauthenticated)
  return (
    <div
      className="min-h-screen relative overflow-hidden bg-white text-slate-900 pb-32"
      onMouseMove={handleMouseMove}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none no-select-drag" />

      <div
        className="absolute top-0 left-0 right-0 h-[650px] opacity-[0.05] bg-cover bg-center pointer-events-none no-select-drag"
        style={{ backgroundImage: "url('/bg_sky.svg')" }}
      />

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 relative z-10 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold shadow-xs">
          <span>✨</span>
          <span>Next-Gen AI Career Orchestrator</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
          AI 에이전트와 함께 구축하는<br />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
            개인 맞춤형 커리어 오케스트레이션
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto font-normal leading-relaxed">
          이력서 고도화, 실시간 모의 면접, ATS 매칭률 분석, AI 포토 스튜디오까지.<br />
          당신의 전 커리어 여정을 지능적으로 관리합니다.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
          <button
            onClick={fillMockCredentials}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all duration-200 shadow-md"
          >
            🚀 테스트 모드로 즉시 시작하기 (Mock 체험)
          </button>
          <Link
            href="/auth/register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all duration-200"
          >
            회원가입
          </Link>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-12">
          {stats.map((s, idx) => (
            <div key={idx} className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-xs">
              <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-400 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Kairos 핵심 기능</h2>
          <p className="text-sm text-slate-400">AI가 지원하는 4가지 맞춤형 커리어 모듈</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bento 1: Resume Enhancer */}
          <div className="bg-gradient-to-br from-slate-50 to-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">📄</div>
              <h3 className="text-xl font-bold text-slate-900">이력서 3단계 AI 고도화</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Draft → Evaluate → Improve 체인으로 초안을 작성하고 STAR 기법 기반 성과 중심으로 정밀 재작성합니다.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">AI 평가 점수 시뮬레이터</span>
                <span className={`font-black font-mono ${sliderColorClass}`}>{sliderPercentage}점</span>
              </div>
              <input
                type="range"
                min={20}
                max={98}
                value={evalSliderScore}
                onChange={e => setEvalSliderScore(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl leading-relaxed font-mono">
                {sliderText}
              </p>
            </div>
          </div>

          {/* Bento 2: ATS Matching */}
          <div className="bg-gradient-to-br from-slate-50 to-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">🎯</div>
              <h3 className="text-xl font-bold text-slate-900">AI ATS 적합성 진단</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                채용공고(JD)의 키워드를 자동으로 추출하여 내 이력서와의 매칭률 및 누락 키워드를 분석합니다.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
              <p className="text-xs font-bold text-slate-700">감지된 핵심 스택</p>
              <div className="flex flex-wrap gap-2">
                {jdChips.map((chip, idx) => (
                  <span
                    key={idx}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
                      chip.matched
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-red-50 text-red-700 border border-red-100'
                    }`}
                  >
                    {chip.matched ? '✓' : '✗'} {chip.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Bento 3: Mock Interview */}
          <div className="bg-gradient-to-br from-slate-50 to-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">🎤</div>
              <h3 className="text-xl font-bold text-slate-900">실시간 AI 스트리밍 면접</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                직무와 난이도에 맞춘 맞춤형 질문과 실시간 스트리밍 대화로 면접을 대비하세요.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-900 font-medium">
                💬 {activeInterviewQuestion}
              </div>
              <div className="space-y-1.5">
                {interviewAnswers.map((ans, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveInterviewQuestion(ans.response)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-100 text-xs text-slate-600 hover:border-blue-300 hover:bg-blue-50/30 transition-all font-medium"
                  >
                    👉 {ans.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bento 4: Semantic Search */}
          <div className="bg-gradient-to-br from-slate-50 to-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">🗂️</div>
              <h3 className="text-xl font-bold text-slate-900">AI 시맨틱 경력 검색</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                1536차원 임베딩 기반으로 내 경력 이력을 자연어로 손쉽게 찾아보세요.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={vectorSearchQuery}
                  onChange={e => setVectorSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && triggerVectorSearch()}
                  placeholder="예: 대용량 트래픽 처리 경험"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-400"
                />
                <button
                  onClick={triggerVectorSearch}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  검색
                </button>
              </div>
              <div className="space-y-2 max-h-[110px] overflow-y-auto">
                {vectorResults.map((res, idx) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{res.company}</p>
                      <p className="text-[10px] text-slate-400">{res.role}</p>
                    </div>
                    <span className="text-xs font-bold font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {res.similarity}% 유사도
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 pt-16 text-center text-xs text-slate-400">
        <p>© 2026 Kairos. All rights reserved.</p>
      </footer>
    </div>
  );
}
