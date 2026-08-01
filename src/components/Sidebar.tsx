'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: '대시보드', path: '/', icon: '📊' },
    { label: 'AI 이력서 고도화', path: '/resume', icon: '📄' },
    { label: 'AI 실시간 모의면접', path: '/interview', icon: '🎙️' },
    { label: 'ATS 적합도 분석', path: '/ats', icon: '🎯' },
    { label: 'AI Humanizer', path: '/humanizer', icon: '✍️' },
    { label: '예상 질문 (Q&A)', path: '/qa', icon: '❓' },
    { label: '경력 히스토리', path: '/career', icon: '💼' },
    { label: 'AI 프로필 스튜디오', path: '/studio', icon: '📸' },
    { label: '문서 파서/검증', path: '/docs', icon: '📂' },
    { label: '커뮤니티', path: '/community', icon: '💬' },
    { label: '설정', path: '/settings', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full min-h-screen text-slate-300">
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <span className="text-xl">✨</span>
        <span className="font-bold text-white text-lg tracking-wide">Kairos Career OS</span>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        Kairos Next.js v15.0
      </div>
    </aside>
  );
}
