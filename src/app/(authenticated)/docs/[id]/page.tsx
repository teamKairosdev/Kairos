'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Spinner from '@/components/Spinner';
import HwpViewer from '@/components/HwpViewer';

interface DocInfo {
  id: string;
  title: string;
  ext: string;
  size: number;
  createdAt: string;
  textContent: string;
}

export default function DocDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [doc, setDoc] = useState<DocInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDoc() {
      try {
        const res = await fetch(`/api/docs/${id}?text=1`);
        if (res.ok) {
          setDoc(await res.json());
        }
      } catch {} finally {
        setLoading(false);
      }
    }
    fetchDoc();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-20 text-gray-500">
        문서를 찾을 수 없습니다.
      </div>
    );
  }

  const isHwp = doc.ext === 'hwp' || doc.ext === 'hwpx';

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
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors"
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
          <h2 className="text-sm font-semibold text-gray-700">문서 추출 텍스트</h2>
          <div className="p-4 md:p-6 rounded-xl bg-gray-50 border border-gray-100 text-sm font-mono leading-relaxed whitespace-pre-wrap break-words text-gray-800">
            {doc.textContent || '추출된 텍스트가 없습니다.'}
          </div>
        </div>
      </div>
    </div>
  );
}
