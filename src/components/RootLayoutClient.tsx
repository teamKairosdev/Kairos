'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import CareerAssistantPanel from '@/components/CareerAssistantPanel';

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [assistantPanelOpen, setAssistantPanelOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { name: '홈', path: '/' },
    { name: 'AI 이력서', path: '/resume' },
    { name: '모의면접', path: '/interview' },
    { name: 'ATS 분석', path: '/ats' },
    { name: 'Humanizer', path: '/humanizer' },
    { name: 'Q&A', path: '/qa' },
    { name: '경력', path: '/career' },
    { name: '스튜디오', path: '/studio' },
    { name: '문서', path: '/docs' },
    { name: '소개', path: '/presentation' },
  ];

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden relative">
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-64 max-w-[80vw] bg-slate-900 h-full p-4 z-10 flex flex-col shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <span className="font-bold text-white text-lg">Kairos Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              <nav className="mt-4 flex-1 space-y-2 overflow-y-auto">
                {navLinks.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                      pathname === item.path
                        ? 'bg-indigo-600/30 text-indigo-300'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="pt-4 border-t border-slate-800">
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
                >
                  <span>⚙️</span>
                  <span>설정</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="md:hidden flex items-center justify-between p-3 bg-slate-900 border-b border-slate-800">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              ☰ 메뉴
            </button>
            <span className="font-semibold text-sm text-slate-200">Kairos Career OS</span>
            <div className="w-16" />
          </div>

          <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>

        <CareerAssistantPanel />
      </div>

      <footer className="border-t border-slate-800/80 bg-slate-900/50 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>© 2026 Kairos Personal AI Career Steward. All rights reserved.</div>
          <nav className="flex items-center gap-4">
            {navLinks.slice(0, 5).map((item) => (
              <Link key={item.path} href={item.path} className="hover:text-slate-400">
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
