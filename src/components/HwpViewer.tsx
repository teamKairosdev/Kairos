'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

interface ParsedHwp {
  pageCount(): number;
  renderPageSvg(page: number): string;
}

const SCALE_STEPS = [0.75, 1, 1.25, 1.5];

const STAGE_LABELS: Record<string, string> = {
  parser: '문서 파서 준비 중…',
  fetch: '문서를 불러오는 중…',
  parse: '문서 파싱 중…',
  render: '페이지 렌더링 중…',
};

export default function HwpViewer({ docId }: { docId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef(new Map<string, ParsedHwp>());
  const disposedRef = useRef(false);
  const scaleRef = useRef(1);

  const [stage, setStage] = useState<'loading' | 'error' | 'ready'>('loading');
  const [stageKey, setStageKey] = useState('parser');
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [scaleIdx, setScaleIdx] = useState(1);

  const applyScale = useCallback(() => {
    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;
    svg.style.transformOrigin = 'top center';
    svg.style.transform = `scale(${scaleRef.current})`;
  }, []);

  const open = useCallback(
    async (id: string, targetPage: number) => {
      if (disposedRef.current) return;
      setStage('loading');
      setError('');
      setRendering(true);
      setStageKey('parser');
      try {
        await ensureRhwpInit();
        if (disposedRef.current) return;
        let doc = cacheRef.current.get(id);
        if (!doc) {
          setStageKey('fetch');
          const res = await fetch(`/api/docs/${id}`);
          if (!res.ok) throw new Error('문서를 불러오지 못했습니다.');
          const bytes = new Uint8Array(await res.arrayBuffer());
          if (disposedRef.current) return;
          setStageKey('parse');
          const { HwpDocument } = await import('@rhwp/core');
          doc = new HwpDocument(bytes) as unknown as ParsedHwp;
          cacheRef.current.set(id, doc);
        }
        if (disposedRef.current) return;
        const count = doc.pageCount();
        setPageCount(count);
        const p = Math.min(Math.max(0, targetPage), Math.max(0, count - 1));
        setPage(p);
        setStageKey('render');
        await new Promise((r) => setTimeout(r, 30));
        if (disposedRef.current || !containerRef.current) return;
        containerRef.current.innerHTML = count > 0 ? doc.renderPageSvg(p) : '';
        applyScale();
        setStage('ready');
      } catch (err: unknown) {
        if (disposedRef.current) return;
        setError(err instanceof Error ? err.message || 'HWP 문서를 열 수 없습니다.' : 'HWP 문서를 열 수 없습니다.');
        setStage('error');
      } finally {
        if (!disposedRef.current) setRendering(false);
      }
    },
    [applyScale]
  );

  useEffect(() => {
    disposedRef.current = false;
    cacheRef.current.clear();
    open(docId, 0);
    return () => {
      disposedRef.current = true;
      cacheRef.current.clear();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [docId, open]);

  function goToPage(p: number) {
    if (rendering || p < 0 || p >= pageCount || p === page) return;
    setPage(p);
    setRendering(true);
    setTimeout(() => {
      if (disposedRef.current || !containerRef.current) return;
      const doc = cacheRef.current.get(docId);
      if (!doc) return;
      containerRef.current.innerHTML = doc.renderPageSvg(p);
      applyScale();
      setRendering(false);
    }, 30);
  }

  function changeScale(delta: number) {
    const next = Math.min(SCALE_STEPS.length - 1, Math.max(0, scaleIdx + delta));
    scaleRef.current = SCALE_STEPS[next];
    setScaleIdx(next);
    applyScale();
  }

  const navBtn =
    'px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 text-xs font-semibold transition-colors active:scale-[0.98]';
  const scaleBtn =
    'w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 text-xs font-bold transition-colors active:scale-[0.98]';

  return (
    <div className="space-y-3">
      <div className="relative">
        <div
          ref={containerRef}
          className="overflow-auto max-h-[75vh] min-h-64 bg-gray-100 rounded-xl border border-gray-200 p-4 [&_svg]:max-w-none [&_svg]:mx-auto [&_svg]:shadow-lg [&_svg]:bg-white"
        />
        {stage !== 'ready' && (
          <div className="absolute inset-0 z-10 rounded-xl bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3">
            {stage === 'error' ? (
              <>
                <p className="text-sm text-gray-600 max-w-sm text-center px-6 break-words">{error}</p>
                <button
                  onClick={() => open(docId, page)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors active:scale-[0.98]"
                >
                  다시 시도
                </button>
              </>
            ) : (
              <>
                <Spinner className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-500">{STAGE_LABELS[stageKey] || '문서를 준비 중…'}</p>
              </>
            )}
          </div>
        )}
        {stage === 'ready' && rendering && (
          <div className="absolute top-3 right-3 z-10 bg-white rounded-full shadow-card p-2">
            <Spinner className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {stage === 'ready' && pageCount > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <button onClick={() => goToPage(page - 1)} disabled={page === 0 || rendering} className={navBtn}>
              ← 이전
            </button>
            <span className="text-xs text-gray-500 font-medium">
              {page + 1} / {pageCount}
            </span>
            <button onClick={() => goToPage(page + 1)} disabled={page >= pageCount - 1 || rendering} className={navBtn}>
              다음 →
            </button>
          </div>
          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
            <button
              onClick={() => changeScale(-1)}
              disabled={scaleIdx === 0}
              className={scaleBtn}
              aria-label="크기 축소"
            >
              −
            </button>
            <span className="text-xs text-gray-500 w-11 text-center">{Math.round(SCALE_STEPS[scaleIdx] * 100)}%</span>
            <button
              onClick={() => changeScale(1)}
              disabled={scaleIdx === SCALE_STEPS.length - 1}
              className={scaleBtn}
              aria-label="크기 확대"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
