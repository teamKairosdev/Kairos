'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, NAV_SECTIONS, isNavItemActive } from '@/lib/nav';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full text-slate-300">
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <span className="text-xl">✨</span>
        <span className="font-bold text-white text-lg tracking-wide">Kairos Career OS</span>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="사이드 메뉴">
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
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      } ${focusRing}`}
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

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        © 2026 Kairos
      </div>
    </aside>
  );
}
