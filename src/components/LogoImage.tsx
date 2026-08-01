'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface LogoImageProps {
  src?: string;
  alt?: string;
  imgClass?: string;
  style?: React.CSSProperties;
}

export default function LogoImage({
  src = '/kairos-logo.png',
  alt = 'Kairos Logo',
  imgClass = 'h-8 w-auto object-contain',
  style,
}: LogoImageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setMenuPos({ top: e.clientY, left: e.clientX });
    setMenuOpen(true);
  }

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('text/plain', window.location.origin + src);
    e.dataTransfer.setData('text/uri-list', window.location.origin + src);
  }

  async function copyImageToClipboard() {
    setMenuOpen(false);
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type || 'image/png']: blob }),
      ]);
      showToast('로고 이미지가 클립보드에 복사되었습니다.');
    } catch {
      showToast('이미지 복사 실패 (보안 제한)');
    }
  }

  async function copyImageUrl() {
    setMenuOpen(false);
    try {
      const fullUrl = window.location.origin + src;
      await navigator.clipboard.writeText(fullUrl);
      showToast('이미지 주소가 복사되었습니다.');
    } catch {
      showToast('주소 복사 실패');
    }
  }

  function saveImage() {
    setMenuOpen(false);
    const a = document.createElement('a');
    a.href = src;
    a.download = 'kairos-logo.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('로고 이미지 다운로드를 시작합니다.');
  }

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const contextMenuContent = (
    <>
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 w-48 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1 text-xs text-slate-200"
          style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}
        >
          <button
            onClick={copyImageToClipboard}
            className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>이미지 복사</span>
          </button>
          <button
            onClick={copyImageUrl}
            className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span>이미지 주소 복사</span>
          </button>
          <div className="my-1 border-t border-slate-800" />
          <button
            onClick={saveImage}
            className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>이미지 저장</span>
          </button>
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900 border border-indigo-500/40 text-indigo-200 text-xs rounded-lg shadow-xl animate-fade-in">
          {toastMsg}
        </div>
      )}
    </>
  );

  return (
    <div className="relative inline-block" onContextMenu={handleContextMenu}>
      <img
        src={src}
        alt={alt}
        className={imgClass}
        style={style}
        draggable
        onDragStart={handleDragStart}
      />
      {mounted && createPortal(contextMenuContent, document.body)}
    </div>
  );
}
