'use client';

interface ThinkingBubbleProps {
  active?: boolean;
  step?: number;
  totalSteps?: number;
  stepTitle?: string;
  thinkingDetails?: string;
  indeterminate?: boolean;
}

export default function ThinkingBubble({
  active = false,
  step = 1,
  totalSteps = 3,
  stepTitle = 'AI 심층 추론 중...',
  thinkingDetails,
  indeterminate = false,
}: ThinkingBubbleProps) {
  if (!active) return null;

  const isIndeterminate = indeterminate || totalSteps <= 0;
  const percent = isIndeterminate
    ? null
    : Math.min(100, Math.round((step / totalSteps) * 100));

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative my-4 p-4 rounded-xl bg-slate-900/80 border border-indigo-500/30 text-indigo-200 backdrop-blur-sm shadow-lift"
    >
      <span
        aria-hidden
        className="absolute -bottom-1.5 left-6 w-3 h-3 bg-slate-900 border-b border-r border-indigo-500/30 rounded-br-sm rotate-45"
      />
      <style>{`
        @keyframes kairos-think-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span aria-hidden className="inline-block w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          <span className="font-semibold text-sm text-indigo-300">{stepTitle}</span>
        </div>
        {percent !== null && (
          <span className="text-xs text-indigo-400 font-mono">
            {step}/{totalSteps} ({percent}%)
          </span>
        )}
      </div>

      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-2">
        {isIndeterminate ? (
          <div
            aria-hidden
            className="bg-gradient-to-r from-transparent via-indigo-400 to-transparent h-full w-1/3 rounded-full"
            style={{ animation: 'kairos-think-slide 1.2s ease-in-out infinite' }}
          />
        ) : (
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        )}
      </div>

      {thinkingDetails && (
        <p className="text-xs text-slate-400 font-mono line-clamp-2 leading-relaxed">
          {thinkingDetails}
        </p>
      )}
    </div>
  );
}
