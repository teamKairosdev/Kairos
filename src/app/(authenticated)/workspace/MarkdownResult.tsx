'use client';

import { useEffect, useState } from 'react';
import { renderMarkdown } from './markdown';

export const MAX_MARKDOWN_RETRIES = 3;

export default function MarkdownResult({ content }: { content: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let retries = 0;
    setHtml(null);
    setError(null);
    setRetryCount(0);

    const attempt = () => {
      if (cancelled) return;
      try {
        const rendered = renderMarkdown(content);
        if (!rendered || rendered.includes('undefined')) throw new Error('Markdown 결과가 비어 있습니다.');
        setHtml(rendered);
      } catch (renderError: unknown) {
        if (retries < MAX_MARKDOWN_RETRIES) {
          retries += 1;
          setRetryCount(retries);
          timer = setTimeout(attempt, 250);
          return;
        }
        setError(renderError instanceof Error ? renderError.message : 'Markdown 렌더링에 실패했습니다.');
      }
    };

    attempt();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [content]);

  if (html) {
    return <div className="prose prose-sm max-w-none text-slate-700 leading-7" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  if (error) {
    return (
      <div className="space-y-2 rounded-xl border border-red-100 bg-red-50 p-4" role="alert">
        <p className="text-xs font-semibold text-red-700">Markdown 결과를 렌더링하지 못했습니다.</p>
        <p className="text-[11px] text-red-600">{error}</p>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white/70 p-3 text-[11px] text-slate-600">{content}</pre>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500" role="status" aria-live="polite">
      Markdown 렌더링을 준비하고 있습니다{retryCount > 0 ? ` (재시도 ${retryCount}/${MAX_MARKDOWN_RETRIES})` : ''}.
    </div>
  );
}
