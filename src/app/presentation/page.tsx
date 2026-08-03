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

    const getSlideContent = (target: EventTarget | null): HTMLElement | null => {
      if (!(target instanceof Element)) return null;
      return target.closest<HTMLElement>('.ks-slide-content');
    };

    // Touch / swipe. Let a slide consume the gesture while its content can scroll.
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartScroller: HTMLElement | null = null;
    let touchStartScrollTop = 0;
    let touchStartScrollHeight = 0;
    let touchStartClientHeight = 0;
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      if (!touch) return;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartScroller = getSlideContent(e.target);
      if (touchStartScroller) {
        touchStartScrollTop = touchStartScroller.scrollTop;
        touchStartScrollHeight = touchStartScroller.scrollHeight;
        touchStartClientHeight = touchStartScroller.clientHeight;
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 50) {
        const hasScrollableContent = touchStartScrollHeight > touchStartClientHeight + 1;
        const atTop = touchStartScrollTop <= 1;
        const atBottom = touchStartScrollTop + touchStartClientHeight >= touchStartScrollHeight - 1;
        const canChangeSlide = !touchStartScroller || !hasScrollableContent || (dy < 0 ? atBottom : atTop);
        if (canChangeSlide) showSlide(currentRef.current + (dy < 0 ? 1 : -1));
      }
      touchStartScroller = null;
    };

    // Wheel. Navigate only when the active slide is already at its scroll boundary.
    let wheelTimer: number | null = null;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.deltaY === 0) return;
      const content = getSlideContent(e.target);
      if (content && content.scrollHeight > content.clientHeight + 1) {
        const atTop = content.scrollTop <= 1;
        const atBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 1;
        const contentCanScroll = e.deltaY < 0 ? !atTop : !atBottom;
        if (contentCanScroll) return;
      }
      if (wheelTimer !== null) return;
      wheelTimer = window.setTimeout(() => {
        wheelTimer = null;
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
      if (wheelTimer !== null) window.clearTimeout(wheelTimer);
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
      <div className="ks-root">
        {/* 발표 페이지의 고정 셸 */}
        <div className="ks-brand">
          <span className="ks-brand-name">
            Kairos Platform
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
