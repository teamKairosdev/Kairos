'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in-up motion-reduce:animate-none">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-soft">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">문제가 발생했어요</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          {error.message || '페이지를 불러오는 도중 문제가 발생했습니다.'}
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono">오류 코드: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={reset}
            className="px-5 py-3 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-soft"
          >
            다시 시도
          </button>
          <button
            onClick={() => router.back()}
            className="px-5 py-3 border border-slate-200 bg-white text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    </div>
  );
}
