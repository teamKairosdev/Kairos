'use client';

import React from 'react';
import Link from 'next/link';

export default function PresentationPage() {
  const features = [
    { title: 'AI Resume', desc: '3단계 AI 체인으로 이력서 고도화' },
    { title: 'Mock Interview', desc: '실시간 가상 면접관과 대화형 면접' },
    { title: 'ATS Matrix', desc: '기업 채용 시스템 역분석 및 점수화' },
    { title: 'Humanizer', desc: 'AI 정형화 문장을 자연스러운 작성체로 교정' },
    { title: 'Vector Search', desc: '경력 시맨틱 검색 및 pgvector 매칭' },
    { title: 'MCP Hub', desc: '공공 공고(워크넷, 고용24) 연동 및 통합' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 md:p-12">
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✨</span>
          <span className="text-xl font-bold tracking-tight">Kairos Platform</span>
        </div>
        <Link
          href="/"
          className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
        >
          대시보드 가기
        </Link>
      </header>

      <main className="max-w-5xl mx-auto w-full my-12 space-y-16">
        <section className="text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
            Next-Gen Personal AI Career Steward
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            개인 맞춤형 AI 이력서 고도화, 모의면접, ATS 분석부터 공공 채용 정보 연동까지.
            Kairos Career OS가 당신의 취업과 이직 성공을 지원합니다.
          </p>
          <div className="pt-4">
            <Link
              href="/resume"
              className="inline-block px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 transition-all text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25"
            >
              지금 시작하기
            </Link>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-center text-slate-200">주요 탑재 기능</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-colors"
              >
                <h3 className="font-semibold text-lg text-indigo-300 mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center py-12 bg-indigo-950/30 border border-indigo-500/20 rounded-3xl p-8 space-y-4">
          <h2 className="text-2xl font-bold text-indigo-200">개발자 & 아키텍트 가이드</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Next.js 15, React 19, TypeScript, Drizzle ORM, Vercel AI SDK가 적용된 모던 아키텍처입니다.
          </p>
          <Link
            href="/docs"
            className="inline-block px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
          >
            문서 파서 확인하기
          </Link>
        </section>
      </main>

      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-slate-600 border-t border-slate-900 pt-6">
        © 2026 Kairos. Built with Next.js 15 App Router & React 19.
      </footer>
    </div>
  );
}
