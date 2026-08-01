'use client';

import React from 'react';

export default function Spinner({
  className = 'w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin',
}: {
  className?: string;
}) {
  return <div className={className} />;
}
