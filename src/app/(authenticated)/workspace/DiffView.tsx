'use client';

import { diffLines } from 'diff';

export default function DiffView({ before, after }: { before: string; after: string }) {
  const changes = diffLines(before || '', after || '');
  if (!before && !after) {
    return <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">비교할 두 버전이 없습니다.</p>;
  }
  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-slate-950 text-[11px] leading-6 font-mono" aria-label="문서 Diff">
      {changes.map((change, index) => (
        <div
          key={`${index}-${change.value.slice(0, 12)}`}
          className={`whitespace-pre-wrap px-3 ${change.added ? 'bg-emerald-500/20 text-emerald-100' : change.removed ? 'bg-red-500/20 text-red-100' : 'text-slate-300'}`}
        >
          <span className="mr-2 inline-block w-3 select-none text-slate-500">{change.added ? '+' : change.removed ? '-' : ' '}</span>
          {change.value}
        </div>
      ))}
    </div>
  );
}
