'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import CareerAssistantPanel from '@/components/CareerAssistantPanel';
import { NAV_ITEMS, NAV_SECTIONS, isNavItemActive } from '@/lib/nav';

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  useEffect(() => {
    closeMobileMenu();
  }, [pathname, closeMobileMenu]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMobileMenu();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, closeMobileMenu]);

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 flex flex-col">
      <Navbar onMenuToggle={() => setMobileMenuOpen((open) => !open)} menuOpen={mobileMenuOpen} />

      <div className="flex flex-1 overflow-hidden relative">
        <div className="hidden md:block">
          <Sidebar />
        </div>

        <div
          className={`fixed inset-0 z-50 md:hidden ${mobileMenuOpen ? '' : 'pointer-events-none'}`}
          aria-hidden={!mobileMenuOpen}
        >
          <div
            className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
              mobileMenuOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={closeMobileMenu}
          />
          <aside
            className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <span className="font-bold text-white text-lg tracking-wide">Kairos Career OS</span>
              <button
                onClick={closeMobileMenu}
                aria-label="메뉴 닫기"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="모바일 메뉴">
              {NAV_SECTIONS.map((section) => {
                const items = NAV_ITEMS.filter((item) => item.section === section.key);
                if (items.length === 0) return null;
                return (
                  <div key={section.key} className="mb-3">
                    <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {section.label}
                    </p>
                    <div className="space-y-0.5">
                      {items.map((item) => {
                        const isActive = isNavItemActive(item, pathname);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={closeMobileMenu}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <span className="text-base">{item.icon}</span>
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
              © 2026 Kairos
            </div>
          </aside>
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-gray-50">
          <main
            key={pathname}
            className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto animate-fade-in-up motion-reduce:animate-none"
          >
            {children}
          </main>
        </div>

        <CareerAssistantPanel />
      </div>

      <footer className="border-t border-slate-200 bg-white/70 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>© 2026 Kairos Personal AI Career Steward. All rights reserved.</div>
          <nav className="flex flex-wrap items-center justify-center gap-4" aria-label="푸터 메뉴">
            {NAV_ITEMS.filter((item) => item.section !== 'account').map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-blue-600 transition-colors">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
