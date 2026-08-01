'use client';

import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  iconWrapperClass?: string;
  actionClass?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = 'bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center',
  iconWrapperClass = 'w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-400 text-2xl',
  actionClass = 'inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all',
}: EmptyStateProps) {
  return (
    <div className={className}>
      <div className={iconWrapperClass}>{icon}</div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 mb-6">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className={actionClass}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
