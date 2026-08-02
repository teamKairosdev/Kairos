'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PresentationSlides, { SLIDE_COUNT, SLIDE_CSS } from '@/data/presentationSlides';

export default function PresentationPage() {
  const [current, setCurrent] = useState(0);
  const currentRef = useRef(0);

  const showSlide = useCallback((index: number, updateHash = true) => {
    const clamped = Math.max(0, Math.min(SLIDE_COUNT - 1, index));
    currentRef.current = clamped;
    setCurrent(clamped);
    if (updateHash) {
      window.history.replaceState(null, '', `#${clamped + 1}`);
    }
  }, []);

  useEffect(() => {
    const getSlideIdFromHash = (): number => {
      const m = window.location.hash.match(/^#(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n >= 1 && n <= SLIDE_COUNT) return n - 1;
      }
      return -1;
    };

    // Keyboard
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        showSlide(currentRef.current + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        showSlide(currentRef.current - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        showSlide(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        showSlide(SLIDE_COUNT - 1);
      }
    };

    // Touch / swipe
    let touchStartX = 0;
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].screenX - touchStartX;
      const dy = e.changedTouches[0].screenY - touchStartY;
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 50) {
        showSlide(currentRef.current + (dy < 0 ? 1 : -1));
      }
    };

    // Wheel
    let wheelTimeout = false;
    const onWheel = (e: WheelEvent) => {
      if (wheelTimeout) return;
      wheelTimeout = true;
      window.setTimeout(() => {
        wheelTimeout = false;
      }, 600);
      showSlide(currentRef.current + (e.deltaY > 0 ? 1 : -1));
    };

    // Hash change
    const onHashChange = () => {
      const idx = getSlideIdFromHash();
      if (idx >= 0 && idx !== currentRef.current) showSlide(idx, false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('hashchange', onHashChange);

    // Init
    const hashIdx = getSlideIdFromHash();
    showSlide(hashIdx >= 0 ? hashIdx : 0, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('wheel', onWheel);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [showSlide]);

  return (
    <>
      {/* React 19이 <head>로 자동 hoisting */}
      <link
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        rel="stylesheet"
      />
      <link
        href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap"
        rel="stylesheet"
      />
      <style>{SLIDE_CSS}</style>
      <style>{`@media (max-width: 480px) {
  .ks-keyboard-hint { display: none; }
  .ks-nav-dots { gap: 0.7rem; }
  .ks-nav-dot { width: 14px; height: 14px; }
  .ks-brand-badge { display: none; }
}`}</style>

      <div className="ks-root">
        {/* Branding — 기존 페이지와 조화 */}
        <div className="ks-brand">
          <span className="ks-brand-name">
            <span>✨</span> Kairos Platform
          </span>
          <span className="ks-brand-badge">발표자료</span>
        </div>
        <Link href="/" className="ks-dashboard-link">
          <span className="px-4 py-2.5 sm:py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors">
            대시보드 가기
          </span>
        </Link>

        <PresentationSlides current={current} />

        <nav className="ks-nav-dots" aria-label="슬라이드 내비게이션">
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <button
              key={i}
              className={`ks-nav-dot${current === i ? ' active' : ''}`}
              aria-label={`슬라이드 ${i + 1}`}
              onClick={() => showSlide(i)}
            />
          ))}
        </nav>

        <div className="ks-keyboard-hint">
          <kbd>←</kbd> <kbd>→</kbd> 또는 <kbd>Space</kbd> 로 이동 · <kbd>Home</kbd> 처음 · <kbd>End</kbd> 마지막
        </div>
      </div>
    </>
  );
}
