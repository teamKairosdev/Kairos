'use client';

import React from 'react';

export const DIFFICULTY_OPTIONS = [
  { label: '주니어', value: 'junior' },
  { label: '미들', value: 'medium' },
  { label: '시니어', value: 'senior' },
];

const DIFFICULTY_LABELS: Record<string, string> = {
  junior: '주니어',
  medium: '미들',
  senior: '시니어',
};

const DIFFICULTY_EMOJI_LABELS: Record<string, string> = {
  junior: '주니어',
  medium: '미들',
  senior: '시니어',
};

const DIFFICULTY_BADGE_COLORS: Record<string, string> = {
  junior: 'bg-green-50 text-green-700',
  medium: 'bg-blue-50 text-blue-700',
  senior: 'bg-red-50 text-red-700',
};

export function difficultyLabel(d: string): string {
  return DIFFICULTY_LABELS[d] || d;
}

export function difficultyEmojiLabel(d?: string): string {
  return DIFFICULTY_EMOJI_LABELS[d || ''] || d || '-';
}

export function difficultyBadgeColor(d?: string): string {
  return DIFFICULTY_BADGE_COLORS[d || ''] || 'bg-gray-100 text-gray-600';
}

export default function DifficultyBadge({
  difficulty,
  className = 'text-xs font-semibold px-2 py-0.5 rounded-full',
}: {
  difficulty?: string;
  className?: string;
}) {
  return (
    <span className={`${className} ${difficultyBadgeColor(difficulty)}`}>
      {difficultyEmojiLabel(difficulty)}
    </span>
  );
}
