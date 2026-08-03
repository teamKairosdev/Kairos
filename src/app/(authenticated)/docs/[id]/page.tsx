'use client';

import { useState, useEffect, use, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import HwpViewer from '@/components/HwpViewer';
import { useToast } from '@/lib/toast';

interface DocInfo {
  id: string;
  title: string;
  ext: string;
  size: number;
  createdAt: string;
  textContent: string;
}

const PREVIEW_LIMIT = 800;

export default function DocDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const toast = useToast();
  const addToast = useMemo(() => ({ add: toast.add }), []);
  const toastRef = useRef(addToast);
  toastRef.current = addToast;

  const [doc, setDoc] = useState<DocInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showFullText, setShowFullText] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchDoc = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch(`/api/docs/${id}?text=1`);
      if (res.ok) {
        setDoc(await res.json());
      } else {
        setLoadError('문서를 불러오지 못했습니다.');
        toastRef.current.add({ title: '문서를 불러오지 못했습니다.', color: 'red' });
      }
    } catch {
      setLoadError('문서를 불러오지 못했습니다. 네트워크를 확인해주세요.');
      toastRef.current.add({ title: '문서를 불러오지 못했습니다.', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDoc(); }, [fetchDoc]);

  async function copyText() {
    if (!doc?.textContent) return;
    try {
      await navigator.clipboard.writeText(doc.textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toastRef.current.add({ title: '텍스트 복사에 실패했습니다.', color: 'red' });
    }
  }

  function downloadText() {
    if (!doc?.textContent) return;
    const blob = new Blob([doc.textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title || 'document'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toastRef.current.add({ title: '텍스트 파일이 다운로드되었습니다.', color: 'green' });
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        <Skeleton className="h-4 w-32" />
        <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-8 shadow-xs space-y-6">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <EmptyState
          icon="문서"
          title="문서를 찾을 수 없습니다"
          description={loadError || '문서가 삭제되었거나 접근할 수 없습니다.'}
          actionLabel="다시 시도"
          onAction={fetchDoc}
        />
      </div>
    );
  }

  const isHwp = doc.ext === 'hwp' || doc.ext === 'hwpx';
  const text = doc.textContent || '';
  const hasText = text.trim().length > 0;
  const isTruncated = text.length > PREVIEW_LIMIT;
  const visibleText = showFullText || !isTruncated ? text : text.slice(0, PREVIEW_LIMIT) + '…';

  const actionBtn =
    'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors active:scale-[0.98]';

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <Link href="/docs" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
        ← 목록으로 돌아가기
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 break-words">{doc.title}</h1>
            <p className="text-xs text-gray-400 mt-1">
              업로드 시각: {new Date(doc.createdAt).toLocaleString()} · {doc.ext?.toUpperCase()} ·{' '}
              {(doc.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase px-3 py-1 bg-orange-50 text-orange-600 rounded-lg">
              {doc.ext || 'FILE'}
            </span>
            <a
              href={`/api/docs/${doc.id}`}
              download
              className={actionBtn}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
              </svg>
              다운로드
            </a>
            {isHwp && (
              <Link
                href={`/docs/edit?doc=${doc.id}`}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-orange-600 transition-colors"
              >
                편집
              </Link>
            )}
          </div>
        </div>

        {isHwp && (
          <div className="space-y-3 w-full min-w-0 max-w-full">
            <h2 className="text-sm font-semibold text-gray-700">문서 미리보기</h2>
            <div className="w-full min-w-0 max-w-full overflow-hidden">
              <HwpViewer docId={doc.id} />
            </div>
          </div>
        )}

        <div className="space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-700">문서 추출 텍스트</h2>
            <div className="flex items-center gap-2">
              <button onClick={copyText} disabled={!hasText} className={`${actionBtn} disabled:opacity-40`}>
                {copied ? (
                  <svg className="w-3.5 h-3.5 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" />
                  </svg>
                )}
                {copied ? '복사됨' : '복사'}
              </button>
              <button onClick={downloadText} disabled={!hasText} className={`${actionBtn} disabled:opacity-40`}>
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
                </svg>
                다운로드
              </button>
            </div>
          </div>
          <div className="p-4 md:p-6 rounded-xl bg-gray-50 border border-gray-100 text-sm leading-7 whitespace-pre-wrap break-words text-gray-800">
            {hasText ? visibleText : '추출된 텍스트가 없습니다.'}
          </div>
          {isTruncated && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowFullText(v => !v)}
                className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-orange-50"
              >
                {showFullText ? '접기' : `전체 보기 (${text.length.toLocaleString()}자)`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
