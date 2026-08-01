'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/lib/toast';
import Spinner from '@/components/Spinner';
import HwpEditor from '@/components/HwpEditor';

function DocsEditContent() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const initialDocId = searchParams.get('doc') || undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-1">HWP Editor</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {initialDocId ? 'HWP 문서 편집' : '새 HWP 문서 작성'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">웹 에디터로 문서를 편집하고 HWP/HWPX로 저장하세요</p>
        </div>
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
        >
          ← 문서 목록
        </Link>
      </div>

      <HwpEditor
        initialDocId={initialDocId}
        onSaved={(doc) => {
          toast.add({ title: '문서가 저장되었습니다', color: 'green' });
          router.push(`/docs/${doc.id}`);
        }}
      />
    </div>
  );
}

export default function DocsEditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DocsEditContent />
    </Suspense>
  );
}
