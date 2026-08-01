'use client';

import React from 'react';

interface ThinkingBubbleProps {
  active?: boolean;
  step?: number;
  totalSteps?: number;
  stepTitle?: string;
  thinkingDetails?: string;
}

export default function ThinkingBubble({
  active = false,
  step = 1,
  totalSteps = 3,
  stepTitle = 'AI 심층 추론 중...',
  thinkingDetails,
}: ThinkingBubbleProps) {
  if (!active) return null;

  const percent = Math.min(100, Math.round((step / totalSteps) * 100));

  return (
    <div className="my-4 p-4 rounded-xl bg-slate-900/80 border border-indigo-500/30 text-indigo-200 backdrop-blur-sm animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          <span className="font-semibold text-sm text-indigo-300">{stepTitle}</span>
        </div>
        <span className="text-xs text-indigo-400 font-mono">
          Step {step}/{totalSteps} ({percent}%)
        </span>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-2">
        <div
          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      {thinkingDetails && (
        <p className="text-xs text-slate-400 font-mono line-clamp-2 leading-relaxed">
          {thinkingDetails}
        </p>
      )}
    </div>
  );
}
