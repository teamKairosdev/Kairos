'use client';

import { useEffect, useState } from 'react';

export function useSEOMeta(opts: {
  title: string;
  description?: string;
  image?: string;
}) {
  useEffect(() => {
    const fullTitle = `${opts.title} | Kairos`;
    const desc = opts.description || 'Kairos — AI 기반 커리어 플랫폼. 이력서 고도화, 모의 면접, ATS 분석.';
    const img = opts.image || '/og-default.png';

    document.title = fullTitle;

    // Helper to set meta tag
    const setMeta = (attr: string, key: string, content: string) => {
      let element = document.querySelector(`meta[${attr}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:image', img);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', desc);
  }, [opts.title, opts.description, opts.image]);
}
