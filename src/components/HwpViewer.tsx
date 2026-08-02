'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Spinner from '@/components/Spinner';

let initPromise: Promise<unknown> | null = null;

function ensureRhwpInit() {
  if (!initPromise) {
    if (typeof globalThis !== 'undefined') {
      (globalThis as Record<string, unknown>).measureTextWidth = (font: string, text: string) => {
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) return 0;
        ctx.font = font;
        return ctx.measureText(text).width;
      };
    }
    initPromise = import('@rhwp/core').then((m) => m.default({ module_or_path: '/rhwp_bg.wasm' }));
  }
  return initPromise;
}

export default function HwpViewer({ docId }: { docId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState('');

  const renderPage = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      await ensureRhwpInit();
      const { HwpDocument } = await import('@rhwp/core');
      const res = await fetch(`/api/docs/${docId}`);
      if (!res.ok) throw new Error('문서를 불러오지 못했습니다.');
      const bytes = new Uint8Array(await res.arrayBuffer());
      const doc = new HwpDocument(bytes);
      const count = doc.pageCount();
      setPageCount(count);
      containerRef.current.innerHTML = count > 0 ? doc.renderPageSvg(Math.min(page, count - 1)) : '';
      setStatus('ready');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message || 'HWP 문서를 열 수 없습니다.' : 'HWP 문서를 열 수 없습니다.');
      setStatus('error');
    }
  }, [docId, page]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="py-6 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="overflow-auto max-h-[75vh] bg-gray-100 rounded-xl border border-gray-200 p-4 [&_svg]:max-w-none [&_svg]:mx-auto [&_svg]:shadow-lg [&_svg]:bg-white"
      />
      {pageCount > 0 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 text-xs font-semibold transition-colors"
          >
            ← 이전
          </button>
          <span className="text-xs text-gray-500 font-medium">
            {page + 1} / {pageCount}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 text-xs font-semibold transition-colors"
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  );
}
