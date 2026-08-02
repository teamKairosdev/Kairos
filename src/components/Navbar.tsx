'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LogoImage from './LogoImage';
import { NAV_ITEMS, isNavItemActive } from '@/lib/nav';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';

export default function Navbar({ onMenuToggle, menuOpen }: { onMenuToggle?: () => void; menuOpen?: boolean }) {
  const pathname = usePathname();
  const { state, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const primaryItems = NAV_ITEMS.filter((item) => item.featured);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onMenuToggle}
            aria-label="메뉴 열기"
            aria-expanded={menuOpen ?? false}
            className={`md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors ${focusRing}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2.5 group">
            <LogoImage style={{ width: 32, height: 32 }} />
            <span className="font-bold text-lg text-white tracking-tight group-hover:text-blue-400 transition-colors">
              Kairos <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">AI OS</span>
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium" aria-label="주 메뉴">
          {primaryItems.map((item) => {
            const isActive = isNavItemActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`px-3 py-1.5 rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                } ${focusRing}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {state.authenticated && state.user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
                className={`flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-800 transition-colors ${focusRing}`}
              >
                <img
                  src={state.user.avatarUrl || 'https://ui-avatars.com/api/?name=User'}
                  alt={state.user.name}
                  loading="lazy"
                  className="w-8 h-8 rounded-full border border-blue-500/40 object-cover"
                />
                <span className="text-sm font-medium text-slate-200 hidden sm:inline">{state.user.name}</span>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-lift py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-800">
                    <p className="text-sm font-semibold text-white">{state.user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{state.user.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    </svg>
                    <span>설정</span>
                  </Link>
                  <hr className="my-1 border-slate-800" />
                  <button
                    onClick={() => { setDropdownOpen(false); logout(); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-slate-800 text-left transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>로그아웃</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className={`px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors ${focusRing}`}
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
