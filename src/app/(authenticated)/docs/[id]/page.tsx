'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';

export default function DocDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDoc() {
      try {
        const res = await fetch(`/api/docs/${id}`);
        if (res.ok) {
          const data = await res.json();
          setDoc(data);
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
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
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

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <Link href="/docs" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
        ← 목록으로 돌아가기
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{doc.name || doc.title}</h1>
            <p className="text-xs text-gray-400 mt-1">
              업로드 시각: {new Date(doc.createdAt).toLocaleString()}
            </p>
          </div>
          <span className="text-xs font-bold uppercase px-3 py-1 bg-orange-50 text-orange-600 rounded-lg">
            {doc.ext || 'FILE'}
          </span>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">문서 추출 텍스트</h2>
          <div className="p-6 rounded-xl bg-gray-50 border border-gray-100 text-sm font-mono leading-relaxed whitespace-pre-wrap text-gray-800">
            {doc.content || doc.text || '추출된 텍스트가 없습니다.'}
          </div>
        </div>
      </div>
    </div>
  );
}
