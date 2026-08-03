'use client';

import React from 'react';

export const SLIDE_COUNT = 10;

const PRESENTATION_SOURCES = {
  firstEmployment: {
    label: '통계청 청년층 부가조사 · 2025',
    url: 'https://kostat.go.kr/board.es?mid=a10301030200&bid=210',
    host: 'kostat.go.kr 원문',
  },
  longTermUnemployed: {
    label: '국가데이터처·동아일보 · 2026',
    urls: [
      'https://www.korea.kr/briefing/policyBriefingView.do?newsId=156771847',
      'https://www.donga.com/news/Economy/article/all/20260723/134350159/1',
    ],
    host: 'korea.kr · donga.com 원문',
  },
  aiSuspicion: {
    label: '무하유·지디넷코리아 · 2026',
    url: 'https://v.daum.net/v/20260108160242419',
    host: 'v.daum.net 원문',
  },
} as const;

export const SLIDE_CSS = `
.ks-root {
  position: fixed;
  inset: 0;
  z-index: 100;
  overflow: hidden;
  background: #07101f;
  color: #e6edf7;
  font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif;
  --title-size: clamp(1.8rem, 4.8vw, 4.2rem);
  --h2-size: clamp(1.5rem, 3.5vw, 3rem);
  --h3-size: clamp(1rem, 1.8vw, 1.35rem);
  --body-size: clamp(0.78rem, 1.25vw, 1.05rem);
  --small-size: clamp(0.64rem, 0.9vw, 0.82rem);
  --slide-padding-x: clamp(1rem, 5vw, 5rem);
  --slide-padding-top: clamp(4.4rem, 9vh, 6.2rem);
  --slide-padding-bottom: clamp(3.1rem, 7vh, 4.8rem);
  --gap-large: clamp(0.9rem, 2.3vw, 2rem);
  --gap: clamp(0.55rem, 1.3vw, 1.1rem);
  --gap-small: clamp(0.3rem, 0.8vw, 0.65rem);
  --panel: rgba(16, 29, 52, 0.82);
  --panel-soft: rgba(255, 255, 255, 0.045);
  --line: rgba(157, 176, 207, 0.18);
  --text: #e6edf7;
  --muted: #a9b8cc;
  --subtle: #71829a;
  --cyan: #62d7ef;
  --purple: #b9a1ff;
  --green: #81e6b3;
  --amber: #f4cc78;
}

@media (max-height: 700px) {
  .ks-root {
    --slide-padding-top: 3.7rem;
    --slide-padding-bottom: 2.5rem;
    --title-size: clamp(1.55rem, 4.2vw, 3rem);
    --h2-size: clamp(1.25rem, 3vw, 2.35rem);
    --body-size: clamp(0.72rem, 1.1vw, 0.94rem);
  }
}

@media (max-height: 590px) {
  .ks-root {
    --slide-padding-top: 3.1rem;
    --slide-padding-bottom: 2rem;
    --gap-large: 0.75rem;
    --gap: 0.45rem;
  }

  .ks-keyboard-hint,
  .ks-nav-dots {
    display: none !important;
  }
}

@media (max-width: 700px) {
  .ks-root {
    --slide-padding-x: 1rem;
    --slide-padding-top: 4rem;
    --slide-padding-bottom: 2.8rem;
    --title-size: clamp(1.55rem, 8vw, 2.5rem);
    --h2-size: clamp(1.3rem, 6vw, 2rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ks-root *,
  .ks-root *::before,
  .ks-root *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Each slide occupies the same viewport. Only the active slide participates in input. */
.ks-slides-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.ks-slide {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(circle at 12% 18%, rgba(41, 147, 188, 0.15), transparent 32%),
    radial-gradient(circle at 88% 82%, rgba(111, 77, 182, 0.14), transparent 35%),
    linear-gradient(135deg, #07101f 0%, #0d1930 52%, #111a32 100%);
  transition: opacity 0.35s ease, visibility 0.35s ease;
}

.ks-slide::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.45;
  background-image: linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.018) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: linear-gradient(to bottom, black, transparent 80%);
}

.ks-slide::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(98, 215, 239, 0.7), rgba(185, 161, 255, 0.7), transparent);
}

.ks-slide[data-visible] {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  z-index: 1;
}

.ks-slide-content {
  box-sizing: border-box;
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow-y: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  padding: var(--slide-padding-top) var(--slide-padding-x) var(--slide-padding-bottom);
  scrollbar-color: rgba(157, 176, 207, 0.35) transparent;
}

.ks-slide-number {
  position: absolute;
  right: clamp(0.7rem, 2vw, 2rem);
  bottom: clamp(0.55rem, 1.8vw, 1.4rem);
  z-index: 10;
  color: rgba(169, 184, 204, 0.56);
  font-family: 'Clash Display', 'Pretendard', system-ui, sans-serif;
  font-size: clamp(0.68rem, 1vw, 0.85rem);
  letter-spacing: 0.12em;
}

.ks-root h1,
.ks-root h2,
.ks-root h3 {
  margin: 0;
}

.ks-root h1,
.ks-root h2 {
  font-family: 'Clash Display', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif;
  letter-spacing: -0.045em;
}

.ks-root h1 {
  max-width: 940px;
  color: var(--text);
  font-size: var(--title-size);
  font-weight: 750;
  line-height: 1.08;
}

.ks-root h2 {
  max-width: 900px;
  color: var(--text);
  font-size: var(--h2-size);
  font-weight: 700;
  line-height: 1.12;
}

.ks-root h3 {
  color: var(--text);
  font-size: var(--h3-size);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.025em;
}

.ks-root p,
.ks-root li {
  margin: 0;
  color: var(--muted);
  font-size: var(--body-size);
  line-height: 1.55;
  letter-spacing: -0.02em;
}

.ks-root strong {
  color: #f6f9fd;
  font-weight: 700;
}

.ks-lead {
  max-width: 760px;
  margin-top: var(--gap);
}

.ks-subtitle {
  max-width: 680px;
  margin-top: var(--gap);
  color: #afbed0;
  font-size: clamp(0.92rem, 1.8vw, 1.35rem);
  line-height: 1.55;
}

.ks-overline {
  margin-bottom: 0.55em;
  color: var(--cyan);
  font-size: var(--small-size);
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.ks-tagline {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  align-self: flex-start;
  width: fit-content;
  max-width: 100%;
  margin-bottom: var(--gap-large);
  padding: 0.42em 0.85em;
  border: 1px solid rgba(98, 215, 239, 0.28);
  border-radius: 999px;
  background: rgba(98, 215, 239, 0.1);
  color: var(--cyan);
  font-size: var(--small-size);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.ks-tagline-time {
  margin-left: 0.65em;
  padding-left: 0.65em;
  border-left: 1px solid currentColor;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  opacity: 0.82;
}

.ks-tagline.purple {
  border-color: rgba(185, 161, 255, 0.3);
  background: rgba(185, 161, 255, 0.1);
  color: var(--purple);
}

.ks-tagline.amber {
  border-color: rgba(244, 204, 120, 0.3);
  background: rgba(244, 204, 120, 0.1);
  color: var(--amber);
}

.ks-tagline.green {
  border-color: rgba(129, 230, 179, 0.3);
  background: rgba(129, 230, 179, 0.1);
  color: var(--green);
}

.ks-badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 0.28em 0.65em;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.045);
  color: var(--muted);
  font-size: var(--small-size);
  font-weight: 700;
  line-height: 1.3;
}

.ks-badge.cyan { border-color: rgba(98, 215, 239, 0.3); background: rgba(98, 215, 239, 0.1); color: var(--cyan); }
.ks-badge.purple { border-color: rgba(185, 161, 255, 0.3); background: rgba(185, 161, 255, 0.1); color: var(--purple); }
.ks-badge.green { border-color: rgba(129, 230, 179, 0.3); background: rgba(129, 230, 179, 0.1); color: var(--green); }
.ks-badge.amber { border-color: rgba(244, 204, 120, 0.3); background: rgba(244, 204, 120, 0.1); color: var(--amber); }
.ks-badge.red { border-color: rgba(248, 139, 139, 0.3); background: rgba(248, 139, 139, 0.1); color: #ffb2b2; }
.ks-badge.outline { background: transparent; color: #c7d3e3; }

.ks-grid {
  display: grid;
  gap: var(--gap);
  margin-top: var(--gap-large);
}

.ks-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

.ks-card {
  min-width: 0;
  padding: clamp(0.85rem, 1.6vw, 1.35rem);
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--panel);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.12);
}

.ks-card p {
  margin-top: 0.55em;
  font-size: clamp(0.7rem, 1.1vw, 0.91rem);
}

.ks-card h3 + .ks-badge-row,
.ks-card p + .ks-badge-row {
  margin-top: 0.8rem;
}

.ks-badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.ks-highlight-box {
  max-width: 820px;
  margin-top: var(--gap-large);
  padding: clamp(0.75rem, 1.5vw, 1.2rem) clamp(0.9rem, 2vw, 1.5rem);
  border-left: 3px solid var(--cyan);
  border-radius: 0 14px 14px 0;
  background: rgba(98, 215, 239, 0.075);
}

.ks-highlight-box p { color: #ced9e7; }

.ks-scope-note,
.ks-footnote {
  margin-top: var(--gap);
  color: var(--subtle) !important;
  font-size: var(--small-size) !important;
}

.ks-cover-logo {
  margin-top: 0.15em;
  color: #f3f7fb;
  font-family: 'Clash Display', 'Pretendard', system-ui, sans-serif;
  font-size: clamp(3.2rem, 10vw, 8rem);
  font-weight: 800;
  letter-spacing: -0.09em;
  line-height: 0.95;
}

.ks-cover-logo span {
  color: var(--cyan);
}

.ks-cover-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(130px, 1fr));
  gap: 0.55rem;
  width: min(100%, 430px);
  margin-top: clamp(1.2rem, 3vw, 2.3rem);
  text-align: left;
}

.ks-cover-meta-item {
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

.ks-cover-meta-item span {
  display: block;
  margin-bottom: 0.2em;
  color: var(--subtle);
  font-size: var(--small-size);
}

.ks-cover-meta-item strong {
  display: block;
  color: #dce7f3;
  font-size: clamp(0.74rem, 1.1vw, 0.92rem);
}

.ks-cover-time {
  margin-top: 0.85rem;
  color: var(--subtle) !important;
  font-size: var(--small-size) !important;
}

.ks-problem-layout {
  display: grid;
  grid-template-columns: minmax(230px, 0.8fr) minmax(0, 1.2fr);
  gap: var(--gap);
  margin-top: var(--gap-large);
}

.ks-persona-card {
  height: 100%;
  box-sizing: border-box;
  padding: clamp(1rem, 2vw, 1.5rem);
  border: 1px solid rgba(185, 161, 255, 0.26);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(45, 37, 78, 0.78), rgba(15, 28, 49, 0.82));
}

.ks-persona-card h3 { font-size: clamp(1rem, 1.7vw, 1.35rem); }

.ks-persona-context {
  margin-top: 1rem;
  padding-top: 0.8rem;
  border-top: 1px solid rgba(185, 161, 255, 0.2);
  color: #c7c0e4;
  font-size: clamp(0.7rem, 1.1vw, 0.9rem);
  line-height: 1.5;
}

.ks-pain-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--gap-small);
}

.ks-pain-card {
  padding: clamp(0.75rem, 1.4vw, 1.1rem);
  border: 1px solid var(--line);
  border-radius: 15px;
  background: var(--panel-soft);
}

.ks-pain-card .ks-pain-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.7rem;
  height: 1.7rem;
  margin-bottom: 0.7rem;
  border-radius: 9px;
  background: rgba(244, 204, 120, 0.14);
  color: var(--amber);
  font-size: var(--small-size);
  font-weight: 800;
}

.ks-pain-card h3 { font-size: clamp(0.82rem, 1.3vw, 1rem); }
.ks-pain-card p { margin-top: 0.45rem; font-size: clamp(0.65rem, 1vw, 0.82rem); }

.ks-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--gap);
  margin-top: var(--gap);
}

.ks-stat-card {
  min-width: 0;
  min-height: 100%;
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
  column-gap: 0.75rem;
  align-items: start;
  padding: clamp(0.7rem, 1.2vw, 1rem);
  border: 1px solid rgba(157, 176, 207, 0.2);
  border-top: 3px solid rgba(98, 215, 239, 0.72);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.045);
}

.ks-stat-card:nth-child(2) {
  border-top-color: rgba(185, 161, 255, 0.78);
}

.ks-stat-card:nth-child(3) {
  border-top-color: rgba(244, 204, 120, 0.78);
}

.ks-stat-number {
  color: var(--cyan);
  font-family: 'Clash Display', 'Pretendard', system-ui, sans-serif;
  font-size: clamp(1.25rem, 3vw, 2.35rem);
  font-weight: 800;
  line-height: 1;
}

.ks-stat-card:nth-child(2) .ks-stat-number { color: var(--purple); }
.ks-stat-card:nth-child(3) .ks-stat-number { color: var(--amber); }

.ks-stat-number span {
  margin-left: 0.14em;
  color: #d4deeb;
  font-family: inherit;
  font-size: 0.42em;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.ks-stat-body {
  min-width: 0;
}

.ks-stat-card p {
  margin-top: 0;
  color: #d4deeb;
  font-size: clamp(0.72rem, 1.05vw, 0.9rem);
  line-height: 1.35;
}

.ks-stat-meta {
  display: grid;
  gap: 0.38rem;
  margin: 0.75rem 0 0;
}

.ks-stat-meta-row {
  display: grid;
  grid-template-columns: 3.1rem minmax(0, 1fr);
  gap: 0.4rem;
  align-items: start;
}

.ks-stat-meta-row dt {
  color: var(--cyan);
  font-size: clamp(0.58rem, 0.78vw, 0.7rem);
  font-weight: 800;
  line-height: 1.4;
  white-space: nowrap;
}

.ks-stat-card:nth-child(2) .ks-stat-meta-row dt { color: var(--purple); }
.ks-stat-card:nth-child(3) .ks-stat-meta-row dt { color: var(--amber); }

.ks-stat-meta-row dd {
  min-width: 0;
  margin: 0;
  color: #b8c7d8;
  font-size: clamp(0.6rem, 0.85vw, 0.74rem);
  line-height: 1.35;
}

.ks-source-panel {
  margin-top: var(--gap);
  padding: clamp(0.65rem, 1.1vw, 0.9rem) clamp(0.75rem, 1.4vw, 1.1rem);
  border: 1px solid rgba(157, 176, 207, 0.16);
  border-radius: 14px;
  background: rgba(7, 16, 31, 0.35);
}

.ks-source-panel-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.ks-source-panel-header strong {
  color: #dce7f3;
  font-size: clamp(0.68rem, 0.95vw, 0.8rem);
}

.ks-source-panel-header span {
  color: var(--subtle);
  font-size: clamp(0.56rem, 0.78vw, 0.68rem);
}

.ks-source-links {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--gap-small);
  margin-top: 0.65rem;
}

.ks-source-link {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.18rem;
  padding: 0.5rem 0.6rem;
  border: 1px solid rgba(157, 176, 207, 0.14);
  border-radius: 9px;
  color: #cad7e5;
  font-size: clamp(0.59rem, 0.82vw, 0.72rem);
  line-height: 1.35;
  text-decoration: none;
}

.ks-source-link:hover {
  border-color: rgba(98, 215, 239, 0.45);
  color: #f0f7fd;
}

.ks-source-link small {
  color: var(--subtle);
  font-size: clamp(0.53rem, 0.7vw, 0.62rem);
}

.ks-feature-card {
  display: flex;
  flex-direction: column;
  min-height: 185px;
}

.ks-feature-section {
  margin-top: var(--gap-large);
}

.ks-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.7rem;
}

.ks-section-heading .ks-overline {
  margin-bottom: 0.15rem;
}

.ks-section-heading strong {
  color: #dce7f3;
  font-size: clamp(0.8rem, 1.2vw, 0.98rem);
}

.ks-feature-section > .ks-grid {
  margin-top: 0;
}

.ks-roadmap {
  margin-top: var(--gap);
  padding: clamp(0.75rem, 1.35vw, 1.05rem);
  border: 1px dashed rgba(185, 161, 255, 0.38);
  border-radius: 16px;
  background: linear-gradient(120deg, rgba(185, 161, 255, 0.085), rgba(244, 204, 120, 0.04));
}

.ks-roadmap-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.ks-roadmap-header strong {
  color: #e3d9ff;
  font-size: clamp(0.78rem, 1.15vw, 0.94rem);
}

.ks-roadmap-header span {
  color: var(--subtle);
  font-size: clamp(0.58rem, 0.82vw, 0.7rem);
}

.ks-roadmap-items {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--gap-small);
  margin-top: 0.7rem;
}

.ks-roadmap-item {
  display: grid;
  grid-template-columns: 1.35rem minmax(0, 1fr);
  gap: 0.5rem;
  min-width: 0;
  padding: 0.65rem;
  border: 1px solid rgba(185, 161, 255, 0.18);
  border-radius: 11px;
  background: rgba(7, 16, 31, 0.32);
}

.ks-roadmap-item::before {
  content: 'R';
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: rgba(185, 161, 255, 0.16);
  color: var(--purple);
  font-size: 0.62rem;
  font-weight: 800;
}

.ks-roadmap-item strong {
  display: block;
  color: #d8d1ee;
  font-size: clamp(0.66rem, 0.98vw, 0.8rem);
  line-height: 1.35;
}

.ks-roadmap-item p {
  margin-top: 0.25rem;
  color: #9daac0;
  font-size: clamp(0.58rem, 0.82vw, 0.7rem);
  line-height: 1.35;
}

.ks-feature-index {
  margin-bottom: 1.15rem;
  color: var(--cyan);
  font-family: 'Clash Display', 'Pretendard', system-ui, sans-serif;
  font-size: clamp(1.3rem, 3vw, 2.3rem);
  font-weight: 800;
  line-height: 1;
}

.ks-feature-card:nth-child(2) .ks-feature-index { color: var(--purple); }
.ks-feature-card:nth-child(3) .ks-feature-index { color: var(--amber); }

.ks-feature-route {
  margin-top: auto;
  padding-top: 1rem;
  color: var(--subtle);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: var(--small-size);
}

.ks-flow {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--gap);
  margin-top: var(--gap-large);
}

.ks-flow-step {
  position: relative;
  min-width: 0;
  padding: clamp(0.8rem, 1.45vw, 1.25rem) clamp(0.7rem, 1.2vw, 1rem);
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--panel);
}

.ks-flow-step.approval {
  border-color: rgba(129, 230, 179, 0.42);
  background: rgba(129, 230, 179, 0.075);
}

.ks-flow-step.separate {
  border-color: rgba(244, 204, 120, 0.42);
  background: rgba(244, 204, 120, 0.065);
}

.ks-flow-step:not(:last-child)::after {
  content: '→';
  position: absolute;
  top: 50%;
  right: -0.82rem;
  z-index: 3;
  color: var(--cyan);
  font-size: 1.25rem;
  font-weight: 700;
  transform: translateY(-50%);
}

.ks-flow-step .ks-step-number {
  display: block;
  margin-bottom: 0.7rem;
  color: var(--cyan);
  font-size: var(--small-size);
  font-weight: 800;
  letter-spacing: 0.08em;
}

.ks-flow-step.approval .ks-step-number { color: var(--green); }
.ks-flow-step.separate .ks-step-number { color: var(--amber); }

.ks-flow-step h3 { font-size: clamp(0.78rem, 1.25vw, 1rem); }
.ks-flow-step p { margin-top: 0.5rem; font-size: clamp(0.62rem, 0.95vw, 0.78rem); }

.ks-flow-note {
  max-width: 760px;
  margin: var(--gap) auto 0;
  color: var(--subtle) !important;
  text-align: center;
  font-size: var(--small-size) !important;
}

.ks-architecture {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: var(--gap-small);
  margin-top: var(--gap-large);
}

.ks-arch-node,
.ks-arch-services {
  min-width: 0;
  padding: clamp(0.7rem, 1.25vw, 1rem);
  border: 1px solid rgba(98, 215, 239, 0.22);
  border-radius: 14px;
  background: rgba(98, 215, 239, 0.065);
}

.ks-arch-node {
  flex: 1 1 145px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}

.ks-arch-node strong,
.ks-arch-service strong {
  color: #e9f3fb;
  font-size: clamp(0.72rem, 1.15vw, 0.92rem);
}

.ks-arch-node small,
.ks-arch-service small {
  display: block;
  margin-top: 0.35rem;
  color: var(--subtle);
  font-size: clamp(0.56rem, 0.85vw, 0.7rem);
  line-height: 1.35;
}

.ks-arch-arrow {
  display: flex;
  align-items: center;
  color: var(--cyan);
  font-size: 1.25rem;
  font-weight: 700;
}

.ks-arch-services {
  flex: 2 1 500px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--gap-small);
  border-color: rgba(185, 161, 255, 0.28);
  background: rgba(185, 161, 255, 0.075);
}

.ks-arch-services-label {
  grid-column: 1 / -1;
  color: var(--purple);
  font-size: var(--small-size);
  font-weight: 800;
  letter-spacing: 0.05em;
}

.ks-arch-service {
  min-width: 0;
  padding: 0.65rem;
  border: 1px solid rgba(185, 161, 255, 0.18);
  border-radius: 10px;
  background: rgba(7, 16, 31, 0.3);
}

.ks-arch-service code {
  display: block;
  margin-top: 0.35rem;
  color: #d8ccff;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: clamp(0.54rem, 0.78vw, 0.66rem);
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.ks-arch-service small code {
  display: inline;
  margin-top: 0;
  color: inherit;
  font-size: inherit;
}

.ks-arch-backend {
  max-width: 860px;
  margin: var(--gap-small) auto 0;
}

.ks-arch-down {
  display: block;
  color: var(--purple);
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}

.ks-arch-backend-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--gap-small);
  margin-top: 0.35rem;
}

.ks-arch-output {
  min-width: 0;
  padding: 0.7rem 0.8rem;
  border: 1px solid rgba(98, 215, 239, 0.18);
  border-radius: 12px;
  background: rgba(98, 215, 239, 0.045);
}

.ks-arch-output:last-child {
  border-color: rgba(129, 230, 179, 0.2);
  background: rgba(129, 230, 179, 0.045);
}

.ks-arch-output strong {
  color: #e9f3fb;
  font-size: clamp(0.68rem, 1vw, 0.82rem);
}

.ks-arch-output small {
  display: block;
  margin-top: 0.3rem;
  color: var(--subtle);
  font-size: clamp(0.56rem, 0.82vw, 0.68rem);
  line-height: 1.35;
}

.ks-architecture-notes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--gap);
  margin-top: var(--gap);
}

.ks-architecture-note {
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.035);
}

.ks-architecture-note strong {
  display: block;
  color: #dce7f3;
  font-size: clamp(0.7rem, 1vw, 0.82rem);
}

.ks-architecture-note p {
  margin-top: 0.35rem;
  font-size: clamp(0.61rem, 0.9vw, 0.74rem);
}

.ks-demo-board {
  margin-top: var(--gap-large);
  padding: clamp(0.9rem, 1.8vw, 1.45rem);
  border: 1px dashed rgba(244, 204, 120, 0.45);
  border-radius: 20px;
  background: rgba(244, 204, 120, 0.045);
}

.ks-demo-board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: var(--gap);
}

.ks-demo-board-header strong {
  color: #f8e3ae;
  font-size: clamp(0.78rem, 1.25vw, 1rem);
}

.ks-demo-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--gap);
}

.ks-demo-step {
  min-width: 0;
  padding: clamp(0.75rem, 1.25vw, 1rem);
  border: 1px solid rgba(157, 176, 207, 0.18);
  border-radius: 14px;
  background: rgba(7, 16, 31, 0.38);
}

.ks-demo-step .ks-step-number {
  color: var(--amber);
  font-size: var(--small-size);
  font-weight: 800;
  letter-spacing: 0.1em;
}

.ks-demo-step h3 { margin-top: 0.55rem; font-size: clamp(0.78rem, 1.2vw, 0.98rem); }
.ks-demo-step p { margin-top: 0.45rem; font-size: clamp(0.62rem, 0.95vw, 0.78rem); }

.ks-demo-path {
  display: block;
  margin-top: 0.7rem;
  color: #c9d6e6;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: var(--small-size);
  word-break: break-word;
}

.ks-demo-access {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--gap);
  margin-top: var(--gap);
}

.ks-demo-access p {
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.035);
  font-size: clamp(0.65rem, 1vw, 0.8rem);
}

.ks-demo-access p strong {
  display: block;
  margin-bottom: 0.25rem;
  color: #dce7f3;
}

.ks-status-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--gap);
  margin-top: var(--gap-large);
}

.ks-status-card {
  min-width: 0;
  padding: clamp(0.8rem, 1.5vw, 1.2rem);
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--panel);
}

.ks-status-card h3 { margin-top: 0.8rem; font-size: clamp(0.88rem, 1.35vw, 1.08rem); }
.ks-status-card p { margin-top: 0.55rem; font-size: clamp(0.65rem, 1vw, 0.81rem); }

.ks-impact-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--gap);
  margin-top: var(--gap-large);
}

.ks-impact-card {
  position: relative;
  min-width: 0;
  padding: clamp(0.85rem, 1.45vw, 1.2rem);
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--panel);
}

.ks-impact-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 4rem;
  height: 4rem;
  border-radius: 0 0 0 100%;
  background: rgba(98, 215, 239, 0.08);
}

.ks-impact-card:nth-child(2)::after { background: rgba(129, 230, 179, 0.08); }
.ks-impact-card:nth-child(3)::after { background: rgba(185, 161, 255, 0.1); }

.ks-impact-card h3 {
  position: relative;
  z-index: 1;
  margin-top: 0.8rem;
  font-size: clamp(0.88rem, 1.35vw, 1.08rem);
}

.ks-impact-card > p {
  position: relative;
  z-index: 1;
  margin-top: 0.55rem;
  font-size: clamp(0.65rem, 1vw, 0.81rem);
}

.ks-impact-measure {
  position: relative;
  z-index: 1;
  margin-top: 0.8rem;
  padding-top: 0.65rem;
  border-top: 1px solid rgba(157, 176, 207, 0.15);
}

.ks-impact-measure strong {
  display: block;
  color: #cdd9e7;
  font-size: clamp(0.62rem, 0.9vw, 0.74rem);
}

.ks-impact-measure span {
  display: block;
  margin-top: 0.3rem;
  color: var(--subtle);
  font-size: clamp(0.59rem, 0.86vw, 0.7rem);
  line-height: 1.4;
}

.ks-kpi-box {
  margin-top: var(--gap);
  padding: clamp(0.8rem, 1.4vw, 1.1rem);
  border: 1px solid rgba(98, 215, 239, 0.2);
  border-radius: 16px;
  background: rgba(98, 215, 239, 0.045);
}

.ks-kpi-box > strong {
  display: block;
  color: #dce7f3;
  font-size: clamp(0.76rem, 1.15vw, 0.92rem);
}

.ks-kpi-note {
  display: block;
  margin-top: 0.28rem;
  color: var(--subtle);
  font-size: clamp(0.58rem, 0.82vw, 0.7rem);
  line-height: 1.4;
}

.ks-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--gap-small);
  margin-top: 0.75rem;
}

.ks-kpi {
  min-width: 0;
  padding: 0.65rem;
  border-radius: 11px;
  background: rgba(7, 16, 31, 0.35);
}

.ks-kpi-value {
  color: var(--cyan);
  font-size: clamp(0.72rem, 1.2vw, 0.95rem);
  font-weight: 800;
}

.ks-kpi-label {
  margin-top: 0.3rem;
  color: #c8d4e3;
  font-size: clamp(0.6rem, 0.88vw, 0.72rem);
  line-height: 1.35;
}

.ks-qa-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--gap);
  margin-top: var(--gap-large);
}

.ks-qa-card {
  min-width: 0;
  padding: clamp(0.85rem, 1.6vw, 1.3rem);
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--panel);
}

.ks-qa-card .ks-q {
  color: #f1f6fb;
  font-size: clamp(0.8rem, 1.35vw, 1.08rem);
  font-weight: 700;
  line-height: 1.35;
}

.ks-qa-card .ks-a {
  margin-top: 0.55rem;
  color: var(--muted);
  font-size: clamp(0.65rem, 1vw, 0.82rem);
  line-height: 1.55;
}

.ks-checklist-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--gap-small) var(--gap-large);
  max-width: 980px;
  margin-top: var(--gap-large);
}

.ks-checklist-item {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  min-width: 0;
  padding: 0.6rem 0;
  border-bottom: 1px solid rgba(157, 176, 207, 0.11);
}

.ks-checklist-item .ks-box {
  width: 1.05rem;
  height: 1.05rem;
  flex: 0 0 auto;
  margin-top: 0.08rem;
  border: 1px solid rgba(157, 176, 207, 0.5);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.03);
}

.ks-checklist-item span:last-child {
  color: #c7d3e1;
  font-size: clamp(0.68rem, 1.08vw, 0.88rem);
  line-height: 1.45;
}

.ks-final-note {
  margin-top: var(--gap-large);
  color: var(--subtle) !important;
  font-size: var(--small-size) !important;
}

/* Navigation */
.ks-nav-dots {
  position: absolute;
  top: 50%;
  right: clamp(0.55rem, 1.8vw, 1.8rem);
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transform: translateY(-50%);
}

.ks-nav-dot {
  width: 9px;
  height: 9px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(157, 176, 207, 0.28);
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.ks-nav-dot:hover,
.ks-nav-dot.active {
  background: var(--cyan);
  transform: scale(1.25);
}

.ks-keyboard-hint {
  position: absolute;
  bottom: clamp(0.55rem, 1.7vw, 1.35rem);
  left: 50%;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(169, 184, 204, 0.5);
  font-size: clamp(0.52rem, 0.8vw, 0.7rem);
  letter-spacing: 0.02em;
  text-align: center;
  transform: translateX(-50%);
  white-space: nowrap;
}

.ks-keyboard-hint kbd {
  padding: 0.14em 0.45em;
  border: 1px solid rgba(157, 176, 207, 0.2);
  border-radius: 4px;
  background: rgba(157, 176, 207, 0.08);
  font-family: inherit;
  font-size: inherit;
}

/* Persistent shell */
.ks-brand {
  position: absolute;
  top: clamp(0.65rem, 1.8vw, 1.4rem);
  left: clamp(0.7rem, 2vw, 1.8rem);
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.ks-brand-name {
  color: #eef4fb;
  font-family: 'Clash Display', 'Pretendard', system-ui, sans-serif;
  font-size: clamp(0.86rem, 1.35vw, 1.05rem);
  font-weight: 800;
  letter-spacing: 0.01em;
}

.ks-brand-badge {
  padding: 0.25em 0.65em;
  border: 1px solid rgba(98, 215, 239, 0.25);
  border-radius: 999px;
  background: rgba(98, 215, 239, 0.08);
  color: var(--cyan);
  font-size: clamp(0.55rem, 0.8vw, 0.68rem);
}

.ks-dashboard-link {
  position: absolute;
  top: clamp(0.6rem, 1.8vw, 1.4rem);
  right: clamp(0.7rem, 2vw, 1.8rem);
  z-index: 200;
  color: #dbe8f5;
  font-size: var(--small-size);
  font-weight: 700;
  text-decoration: none;
}

.ks-dashboard-link span {
  display: inline-block;
  padding: 0.55em 0.85em;
  border: 1px solid rgba(157, 176, 207, 0.22);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.055);
}

@media (max-width: 920px) {
  .ks-problem-layout { grid-template-columns: 1fr; }
  .ks-pain-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .ks-architecture {
    flex-direction: column;
    flex-wrap: nowrap;
  }
  .ks-arch-node,
  .ks-arch-services {
    box-sizing: border-box;
    width: 100%;
    flex: 0 0 auto;
  }
  .ks-arch-arrow {
    justify-content: center;
    min-height: 1.3rem;
    transform: rotate(90deg);
  }
}

@media (max-width: 700px) {
  .ks-grid-3,
  .ks-status-grid,
  .ks-impact-grid,
  .ks-architecture-notes,
  .ks-demo-steps,
  .ks-qa-grid { grid-template-columns: 1fr; }

  .ks-pain-grid { grid-template-columns: 1fr; }
  .ks-roadmap-items,
  .ks-source-links,
  .ks-arch-backend-grid { grid-template-columns: 1fr; }
  .ks-stat-grid { grid-template-columns: 1fr; }
  .ks-stat-card { display: grid; grid-template-columns: 5.2rem 1fr; column-gap: 0.7rem; align-items: center; }
  .ks-feature-card { min-height: 0; }
  .ks-flow { grid-template-columns: 1fr; gap: 0.85rem; }
  .ks-flow-step:not(:last-child)::after { content: '↓'; top: auto; right: 50%; bottom: -0.87rem; transform: translateX(50%); }
  .ks-arch-services { grid-template-columns: 1fr; }
  .ks-arch-services-label { grid-column: auto; }
  .ks-demo-access { grid-template-columns: 1fr; }
  .ks-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ks-checklist-grid { grid-template-columns: 1fr; }
  .ks-cover-meta { grid-template-columns: 1fr; }
  .ks-dashboard-link span { padding: 0.5em 0.65em; }
}

@media (max-width: 480px) {
  .ks-keyboard-hint { display: none; }
  .ks-nav-dots { right: 0.45rem; gap: 0.65rem; }
  .ks-nav-dot { width: 11px; height: 11px; }
  .ks-brand-badge { display: none; }
  .ks-dashboard-link { display: none; }
}
`;

function Tagline({
  className = '',
  time,
  children,
}: {
  className?: string;
  time?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`ks-tagline ${className}`}>
      <span>{children}</span>
      {time && <span className="ks-tagline-time">{time}</span>}
    </span>
  );
}

function Badge({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <span className={`ks-badge ${className}`}>{children}</span>;
}

function SourcePanel() {
  return (
    <div className="ks-source-panel" aria-label="슬라이드 3 통계 출처">
      <div className="ks-source-panel-header">
        <strong>출처 · 기준연도</strong>
        <span>짧은 표기에서 원문으로 연결</span>
      </div>
      <div className="ks-source-links">
        <a
          className="ks-source-link"
          href={PRESENTATION_SOURCES.firstEmployment.url}
          target="_blank"
          rel="noreferrer"
        >
          <span>{PRESENTATION_SOURCES.firstEmployment.label}</span>
          <small>{PRESENTATION_SOURCES.firstEmployment.host}</small>
        </a>
        <a
          className="ks-source-link"
          href={PRESENTATION_SOURCES.longTermUnemployed.urls[0]}
          target="_blank"
          rel="noreferrer"
        >
          <span>{PRESENTATION_SOURCES.longTermUnemployed.label}</span>
          <small>{PRESENTATION_SOURCES.longTermUnemployed.host}</small>
        </a>
        <a
          className="ks-source-link"
          href={PRESENTATION_SOURCES.aiSuspicion.url}
          target="_blank"
          rel="noreferrer"
        >
          <span>{PRESENTATION_SOURCES.aiSuspicion.label}</span>
          <small>{PRESENTATION_SOURCES.aiSuspicion.host}</small>
        </a>
      </div>
    </div>
  );
}

function Slide({
  index,
  visible,
  contentStyle,
  children,
}: {
  index: number;
  visible: boolean;
  contentStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <section
      className="ks-slide"
      id={`slide-${index}`}
      data-visible={visible ? 'true' : undefined}
      aria-hidden={!visible}
    >
      <div className="ks-slide-content" style={contentStyle}>
        {children}
      </div>
      <span className="ks-slide-number">
        {String(index).padStart(2, '0')} / {String(SLIDE_COUNT).padStart(2, '0')}
      </span>
    </section>
  );
}

function FlowStep({
  number,
  title,
  description,
  className = '',
}: {
  number: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={`ks-flow-step ${className}`}>
      <span className="ks-step-number">{number}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export default function PresentationSlides({ current }: { current: number }) {
  return (
    <div id="slides-container" className="ks-slides-container">
      {/* SLIDE 1: COVER */}
      <Slide index={1} visible={current === 0} contentStyle={{ alignItems: 'center', textAlign: 'center' }}>
        <Tagline time="00:00-00:20 · 20초">2026 SW미래채움 × AI·SW중심대학 연합 경진대회</Tagline>
        <div className="ks-overline">AI 서비스톤</div>
        <div className="ks-cover-logo">
          Kai<span>ros</span>
        </div>
        <h1 style={{ marginTop: '0.35em' }}>
          지원 준비를 위한
          <br />
          AI 커리어 작업공간
        </h1>
        <p className="ks-subtitle">채용공고와 이력서 텍스트를 근거로 지원 준비를 돕는 AI 커리어 작업공간</p>
        <div className="ks-cover-meta">
          <div className="ks-cover-meta-item">
            <span>팀명</span>
            <strong>팀명 입력 필요</strong>
          </div>
          <div className="ks-cover-meta-item">
            <span>발표자</span>
            <strong>발표자 입력 필요</strong>
          </div>
          <div className="ks-cover-meta-item">
            <span>참가 트랙</span>
            <strong>AI 서비스톤</strong>
          </div>
          <div className="ks-cover-meta-item">
            <span>서비스</span>
            <strong>Kairos</strong>
          </div>
        </div>
        <p className="ks-cover-time">발표 본문 5분 · 질의응답 별도 5분 내외</p>
      </Slide>

      {/* SLIDE 2: SERVICE OVERVIEW */}
      <Slide index={2} visible={current === 1}>
        <Tagline time="00:20-00:45 · 25초">01 / 09 · 서비스 개요</Tagline>
        <h2>
          공고·이력서 입력부터
          <br />
          지원 준비까지 확인합니다
        </h2>
        <p className="ks-lead">
          Kairos는 채용공고와 이력서 텍스트를 기준으로 ATS 단서를 분석하고, Gemini REST 기반 개선 제안을 저장한 뒤 텍스트 면접을 별도로 시작하는 작업공간입니다.
        </p>
        <div className="ks-highlight-box">
          <p>
            <strong>핵심 가치</strong>
            <br />
            공고와 이력서 텍스트를 근거로 지원 준비를 돕는 AI 커리어 작업공간
          </p>
        </div>
        <div className="ks-grid ks-grid-3">
          <div className="ks-card">
            <h3>근거를 먼저 보기</h3>
            <p>공고와 이력서에서 발견된 키워드, 누락 단서, 개선 이유를 나눠 확인합니다.</p>
          </div>
          <div className="ks-card">
            <h3>수정은 제안으로</h3>
            <p>AI가 본문을 제안하되, 원문과 변경점을 비교한 뒤 사용자가 반영 여부를 결정합니다.</p>
          </div>
          <div className="ks-card">
            <h3>다음 행동으로</h3>
            <p>분석 결과를 이력서 개선에 반영하고, 저장 후 텍스트 면접을 별도로 시작해 지원 전 준비를 정리합니다.</p>
          </div>
        </div>
        <p className="ks-scope-note">
          현재 범위: 공고·이력서 텍스트 분석, 이력서 개선 제안, 텍스트 면접. 지원 제출과 채용 결과 예측은 제공하지 않습니다.
        </p>
      </Slide>

      {/* SLIDE 3: PROBLEM BACKGROUND AND TARGET */}
      <Slide index={3} visible={current === 2}>
        <Tagline className="purple" time="00:45-01:25 · 40초">02 / 09 · 문제 배경 및 타깃 사용자</Tagline>
        <h2>
          지원할수록 반복되는 준비,
          <br />
          경험을 근거로 정리하기 어렵습니다
        </h2>
        <p className="ks-lead">대표 페르소나는 자신의 경험은 있지만, 공고마다 무엇을 고치고 어떻게 말할지 다시 판단해야 하는 신입 지원자입니다.</p>
        <div className="ks-problem-layout">
          <div className="ks-persona-card">
            <div className="ks-overline">대표 페르소나 1명</div>
            <h3>졸업 1년 차 신입 개발자</h3>
            <p style={{ marginTop: '0.65rem' }}>
              프로젝트 경험과 기술 스택은 있지만 채용공고의 요구사항과 자신의 경험을 연결해 이력서 문장으로 만드는 데 시간이 걸립니다.
            </p>
            <div className="ks-persona-context">
              <strong>지원 직전 상황</strong>
              <br />
              공고를 읽고 이력서를 고친 뒤, AI가 제안한 문장을 믿고 반영해도 되는지 확인하고 싶습니다.
            </div>
          </div>
          <div className="ks-pain-grid">
            <div className="ks-pain-card">
              <span className="ks-pain-number">01</span>
              <h3>비교 비용</h3>
              <p>공고의 요구 역량과 내 경험을 문장 단위로 일일이 대조해야 합니다.</p>
            </div>
            <div className="ks-pain-card">
              <span className="ks-pain-number">02</span>
              <h3>표현의 불확실성</h3>
              <p>AI가 바꾼 문장을 그대로 믿기 어렵고, 원문과 변경 근거를 확인해야 합니다.</p>
            </div>
            <div className="ks-pain-card">
              <span className="ks-pain-number">03</span>
              <h3>준비의 단절</h3>
              <p>이력서, 공고, 면접 준비가 분리되어 다음 행동으로 이어지기 어렵습니다.</p>
            </div>
          </div>
        </div>
        <div className="ks-stat-grid">
          <div className="ks-stat-card">
            <div className="ks-stat-number">
              11.3<span>개월</span>
            </div>
            <div className="ks-stat-body">
              <p>첫 취업 평균 소요기간</p>
              <dl className="ks-stat-meta">
                <div className="ks-stat-meta-row">
                  <dt>기준시점</dt>
                  <dd>2025년 5월</dd>
                </div>
                <div className="ks-stat-meta-row">
                  <dt>모집단</dt>
                  <dd>취업 경험이 있는 청년 졸업자 중 첫 일자리가 임금근로자인 경우</dd>
                </div>
                <div className="ks-stat-meta-row">
                  <dt>출처</dt>
                  <dd>통계청 청년층 부가조사</dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="ks-stat-card">
            <div className="ks-stat-number">48.6<span>%</span></div>
            <div className="ks-stat-body">
              <p>졸업 후 1년 이상 미취업 비중</p>
              <dl className="ks-stat-meta">
                <div className="ks-stat-meta-row">
                  <dt>기준시점</dt>
                  <dd>2026년 5월</dd>
                </div>
                <div className="ks-stat-meta-row">
                  <dt>모집단</dt>
                  <dd>15~29세 최종학교 졸업자 중 현재 미취업자</dd>
                </div>
                <div className="ks-stat-meta-row">
                  <dt>출처</dt>
                  <dd>국가데이터처 부가조사·동아일보</dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="ks-stat-card">
            <div className="ks-stat-number">64.4<span>%</span></div>
            <div className="ks-stat-body">
              <p>제출 자기소개서 AI 작성 의심 비중</p>
              <dl className="ks-stat-meta">
                <div className="ks-stat-meta-row">
                  <dt>기준시점</dt>
                  <dd>2025년 제출분, 2026년 1월 공개</dd>
                </div>
                <div className="ks-stat-meta-row">
                  <dt>모집단</dt>
                  <dd>2025년 실제 채용에 제출된 자기소개서</dd>
                </div>
                <div className="ks-stat-meta-row">
                  <dt>출처</dt>
                  <dd>무하유 프리즘·지디넷코리아</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
        <p className="ks-footnote">세 수치는 서로 다른 모집단·정의·기준시점을 사용한 외부 근거이며, Kairos의 성과 수치가 아닙니다.</p>
        <SourcePanel />
      </Slide>

      {/* SLIDE 4: KEY FEATURES */}
      <Slide index={4} visible={current === 3}>
        <Tagline className="purple" time="01:25-02:00 · 35초">03 / 09 · 주요 기능</Tagline>
        <h2>
          실제로 시연하는
          <br />
          세 가지 기능
        </h2>
        <p className="ks-lead">현재 코드와 시연 경로가 연결된 기능만 제시합니다. 각 기능은 최종 판단을 사용자에게 남깁니다.</p>
        <div className="ks-feature-section">
          <div className="ks-section-heading">
            <div>
              <div className="ks-overline">현재 구현</div>
              <strong>코드 경로와 브라우저 시연이 연결된 3개</strong>
            </div>
            <Badge className="green">시연 가능</Badge>
          </div>
          <div className="ks-grid ks-grid-3">
            <div className="ks-card ks-feature-card">
              <div className="ks-feature-index">01</div>
              <h3>ATS 휴리스틱 분석</h3>
              <p>공고와 이력서 텍스트에서 기술 키워드, 경력, 학력, 키워드 밀도를 결정론적으로 비교합니다.</p>
              <div className="ks-badge-row">
                <Badge className="cyan">결정론적 분석</Badge>
                <Badge className="outline">/ats</Badge>
              </div>
              <span className="ks-feature-route">POST /api/ats/analyze</span>
            </div>
            <div className="ks-card ks-feature-card">
              <div className="ks-feature-index">02</div>
              <h3>AI 이력서 개선 + Diff 승인</h3>
              <p>Gemini가 개선 본문을 제안하고, 원문과 변경점을 비교한 뒤 사용자가 편집기에 반영합니다.</p>
              <div className="ks-badge-row">
                <Badge className="purple">Gemini REST</Badge>
                <Badge className="green">사용자 승인</Badge>
              </div>
              <span className="ks-feature-route">POST /api/resumes/[id]/refine · Diff UI</span>
            </div>
            <div className="ks-card ks-feature-card">
              <div className="ks-feature-index">03</div>
              <h3>텍스트 기반 AI 면접</h3>
              <p>직무와 난이도를 정한 뒤 텍스트로 질문과 답변을 주고받고, 종료 시 대화 세션을 정리합니다.</p>
              <div className="ks-badge-row">
                <Badge className="amber">텍스트 전용</Badge>
                <Badge className="cyan">plain-text stream</Badge>
              </div>
              <span className="ks-feature-route">POST /api/interviews/[id]/chat</span>
            </div>
          </div>
        </div>
        <div className="ks-roadmap">
          <div className="ks-roadmap-header">
            <strong>로드맵 · 아직 구현하지 않은 확장 기능</strong>
            <span>현재 기능과 섞지 않고 다음 검증 대상으로 분리</span>
          </div>
          <div className="ks-roadmap-items">
            <div className="ks-roadmap-item">
              <div>
                <strong>경력 기록 ↔ 공고 근거 연결</strong>
                <p>사용자의 경험 기록에서 지원 문장의 근거를 찾는 다음 단계입니다.</p>
              </div>
            </div>
            <div className="ks-roadmap-item">
              <div>
                <strong>공고 자동 수집</strong>
                <p>현재는 사용자가 공고 텍스트를 직접 입력하며, 수집은 확장 대상입니다.</p>
              </div>
            </div>
            <div className="ks-roadmap-item">
              <div>
                <strong>음성 면접</strong>
                <p>현재 면접은 텍스트 전용이며, 음성 입력·출력은 구현 전입니다.</p>
              </div>
            </div>
          </div>
        </div>
        <p className="ks-scope-note">실제 회사별 ATS 합격 예측과 자동 지원 제출은 현재 구현 범위에 포함하지 않습니다.</p>
      </Slide>

      {/* SLIDE 5: USER FLOW */}
      <Slide index={5} visible={current === 4}>
        <Tagline time="02:00-02:35 · 35초">04 / 09 · 사용자 이용 흐름</Tagline>
        <h2>
          입력한 근거로 준비하고,
          <br />
          면접은 별도로 시작합니다
        </h2>
        <p className="ks-lead">
          <strong>공고·이력서 → ATS → AI 개선 → Diff 승인 → 텍스트 면접</strong>
        </p>
        <div className="ks-flow" aria-label="Kairos 지원 준비 흐름">
          <FlowStep className="input" number="01" title="공고·이력서" description="채용공고와 이력서 텍스트를 입력합니다." />
          <FlowStep number="02" title="ATS" description="매칭 키워드와 누락 단서를 확인합니다." />
          <FlowStep number="03" title="AI 개선" description="Gemini가 수정 제안을 생성합니다." />
          <FlowStep className="approval" number="04" title="Diff 승인" description="원문과 제안문을 비교하고 사용자가 반영 여부를 결정합니다." />
          <FlowStep className="separate" number="05" title="텍스트 면접" description="저장 후 별도 화면에서 직무·난이도를 정해 대화합니다." />
        </div>
        <p className="ks-flow-note">Diff 승인은 사용자 판단 지점입니다. 이력서 저장과 텍스트 면접 시작은 별도 동작이며, 데이터가 다음 단계로 자동 전달되지는 않습니다.</p>
      </Slide>

      {/* SLIDE 6: ARCHITECTURE */}
      <Slide index={6} visible={current === 5}>
        <Tagline className="purple" time="02:35-03:20 · 45초">05 / 09 · AI·SW 활용 구조</Tagline>
        <h2>
          실제 요청 경로를
          <br />
          단순하게 설명합니다
        </h2>
        <p className="ks-lead">화면에서 입력한 내용은 Next.js API route를 거쳐 기능별 분석·생성 경로로 나뉘고, 필요한 결과를 데이터베이스에 저장합니다.</p>
        <div className="ks-architecture" aria-label="실제 코드 요청 경로">
          <div className="ks-arch-node">
            <strong>Next.js 16 UI</strong>
            <small>/ats · /resume/[id] · /interview/[id]</small>
          </div>
          <span className="ks-arch-arrow" aria-hidden="true">→</span>
          <div className="ks-arch-node">
            <strong>Route Handlers</strong>
            <small>입력 검증 · 세션·소유권 확인</small>
          </div>
          <span className="ks-arch-arrow" aria-hidden="true">→</span>
          <div className="ks-arch-services">
            <div className="ks-arch-services-label">실제 코드의 기능별 실행 경로</div>
            <div className="ks-arch-service">
              <strong>ATS</strong>
              <code>/api/ats/analyze</code>
              <small><code>analyzeATSCompatibility</code><br />→ atsAnalyses</small>
            </div>
            <div className="ks-arch-service">
              <strong>이력서 개선</strong>
              <code>/api/resumes/[id]/refine</code>
              <small><code>callLLMStructured</code><br />→ resumeRefinements</small>
            </div>
            <div className="ks-arch-service">
              <strong>텍스트 면접</strong>
              <code>/api/interviews/[id]/chat</code>
              <small><code>streamLLMText</code><br />→ interviewMessages</small>
            </div>
          </div>
        </div>
        <div className="ks-arch-backend">
          <span className="ks-arch-down" aria-hidden="true">↓</span>
          <div className="ks-arch-backend-grid">
            <div className="ks-arch-output">
              <strong>Gemini REST · AI 경로</strong>
              <small>이력서 개선의 구조화 응답 · 텍스트 면접 stream</small>
            </div>
            <div className="ks-arch-output">
              <strong>Drizzle ORM → Neon PostgreSQL</strong>
              <small>ATS·개선·대화 결과 저장 · pgvector 경력 검색<br />DATABASE_URL 설정 시 영속화</small>
            </div>
          </div>
        </div>
        <div className="ks-architecture-notes">
          <div className="ks-architecture-note">
            <strong>ATS 점수의 출처</strong>
            <p><code>src/server/ats.ts</code>의 휴리스틱 로직이 산출하며 LLM을 거치지 않습니다.</p>
          </div>
          <div className="ks-architecture-note">
            <strong>Gemini의 역할</strong>
            <p><code>callLLMStructured</code>와 <code>streamLLMText</code>가 직접 REST를 호출합니다.</p>
          </div>
          <div className="ks-architecture-note">
            <strong>저장 조건</strong>
            <p><code>getDb()</code>가 연결되면 저장하고, 없으면 데모 응답으로 동작합니다.</p>
          </div>
        </div>
        <p className="ks-footnote">위 다이어그램은 현재 시연하는 세 가지 사용자 경로와 실제 호출 함수·저장 테이블을 기준으로 구성했습니다.</p>
      </Slide>

      {/* SLIDE 7: DEMO */}
      <Slide index={7} visible={current === 6}>
        <Tagline time="03:20-04:15 · 55초">06 / 09 · 프로토타입 또는 시연 화면</Tagline>
        <h2>
          가짜 캡처 대신,
          <br />
          실제 실행 순서를 보여드립니다
        </h2>
        <p className="ks-lead">실제 이미지가 준비되지 않은 상태에서 정적 화면을 캡처처럼 만들지 않았습니다. 발표에서는 브라우저를 직접 열어 아래 순서로 시연합니다.</p>
        <div className="ks-demo-board">
          <div className="ks-demo-board-header">
            <strong>시연 안내 · 실제 캡처 아님</strong>
            <div className="ks-badge-row">
              <Badge className="amber">브라우저 직접 시연</Badge>
              <Badge className="outline">Mock 화면: ATS · 이력서 상세 · 면접 상세</Badge>
            </div>
          </div>
          <div className="ks-demo-steps">
            <div className="ks-demo-step">
              <span className="ks-step-number">01</span>
              <h3>ATS 휴리스틱 분석</h3>
              <p>직무명·공고·이력서 텍스트를 입력하고 매칭 점수, 발견·누락 키워드, 세부 진단을 확인합니다.</p>
              <span className="ks-demo-path">/ats</span>
            </div>
            <div className="ks-demo-step">
              <span className="ks-step-number">02</span>
              <h3>AI 개선과 Diff 승인</h3>
              <p>이력서 작업공간에서 AI에게 수정을 요청하고, Diff를 확인한 뒤 제안을 편집기에 반영합니다.</p>
              <span className="ks-demo-path">/resume/[id]</span>
            </div>
            <div className="ks-demo-step">
              <span className="ks-step-number">03</span>
              <h3>텍스트 기반 면접</h3>
              <p>직무·난이도를 선택하고 텍스트로 답변한 뒤, 면접을 종료해 세션을 정리합니다.</p>
              <span className="ks-demo-path">/interview/[id]</span>
            </div>
          </div>
        </div>
        <div className="ks-demo-access">
          <p>
            <strong>접속 경로</strong>
            개발: <code>http://localhost:3000</code> · 발표 자료: <code>/presentation</code><br />
            배포 주소는 발표 전 운영 환경에서 확인 필요
          </p>
          <p>
            <strong>네트워크 장애 시 대체 경로</strong>
            개발용 mock 계정 <code>testmockup / 12345</code>으로 로컬 fixture를 시연합니다. mock 응답은 실제 Gemini가 아닙니다.
          </p>
        </div>
        <p className="ks-footnote">실제 AI 시연에는 로그인 세션과 <code>GOOGLE_GENERATIVE_AI_API_KEY</code>가 필요하며, 저장 기능에는 데이터베이스 설정이 필요합니다.</p>
      </Slide>

      {/* SLIDE 8: IMPACT AND ROADMAP */}
      <Slide index={8} visible={current === 7}>
        <Tagline className="green" time="04:15-04:40 · 25초">07 / 09 · 기대효과 및 확장계획</Tagline>
        <h2>
          효과를 단정하지 않고,
          <br />
          준비 품질을 개선합니다
        </h2>
        <p className="ks-lead">현재는 사용자가 무엇을 고쳤는지 이해하고, 이력서를 저장한 뒤 텍스트 면접을 별도로 시작하는 경험을 만들었습니다. 효과는 실제 사용 데이터로 검증해야 합니다.</p>
        <div className="ks-impact-grid">
          <div className="ks-impact-card">
            <Badge className="cyan">개인 · 기대효과</Badge>
            <h3>수정 이유를 이해하고 승인하는 준비</h3>
            <p>AI 제안을 그대로 받지 않고 원문·변경점을 비교해 사용자가 반영 여부를 결정합니다.</p>
            <div className="ks-impact-measure">
              <strong>검증할 변화</strong>
              <span>Diff 승인율 · 수정 후 저장 완료율</span>
            </div>
          </div>
          <div className="ks-impact-card">
            <Badge className="green">사회 · 기대효과</Badge>
            <h3>실제 경험을 근거로 남기는 지원 준비</h3>
            <p>AI 작성 의심 환경에서 공고와 본인의 경험을 연결해 설명 가능한 문장을 만드는 가설입니다.</p>
            <div className="ks-impact-measure">
              <strong>검증할 변화</strong>
              <span>근거 확인 이해도 · 자기서술 자신감</span>
            </div>
          </div>
          <div className="ks-impact-card">
            <Badge className="purple">시장 · 기대효과</Badge>
            <h3>공고·이력서·면접을 잇는 작업 흐름</h3>
            <p>분리된 준비 도구를 하나의 작업공간에서 이어 쓰는 제품 가설을 실제 사용으로 검증합니다.</p>
            <div className="ks-impact-measure">
              <strong>검증할 변화</strong>
              <span>기능 간 전환율 · 재방문·재사용률</span>
            </div>
          </div>
        </div>
        <div className="ks-kpi-box">
          <strong>측정 전 KPI · 기준선부터 수집</strong>
          <span className="ks-kpi-note">기대효과는 아직 검증 전이며, 현재는 제품 사용 행동과 시스템 품질 지표만 측정합니다.</span>
          <div className="ks-kpi-grid">
            <div className="ks-kpi">
              <div className="ks-kpi-value">측정 전</div>
              <div className="ks-kpi-label">ATS 분석 완료율</div>
            </div>
            <div className="ks-kpi">
              <div className="ks-kpi-value">측정 전</div>
              <div className="ks-kpi-label">AI 제안 대비 Diff 승인율</div>
            </div>
            <div className="ks-kpi">
              <div className="ks-kpi-value">측정 전</div>
              <div className="ks-kpi-label">면접 시작 대비 종료율</div>
            </div>
            <div className="ks-kpi">
              <div className="ks-kpi-value">측정 전</div>
              <div className="ks-kpi-label">AI 요청 완료율·p95 응답시간</div>
            </div>
          </div>
        </div>
        <p className="ks-footnote">현재 코드로 확인 가능한 것은 기능 동작과 사용 흐름이며, 기대효과의 크기와 인과관계는 사용자 테스트 이후 판단합니다.</p>
      </Slide>

      {/* SLIDE 9: Q&A */}
      <Slide index={9} visible={current === 8}>
        <Tagline time="04:40-04:50 · 10초">08 / 09 · Q &amp; A</Tagline>
        <h2>
          질문을 미리 답합니다
          <br />
          한계도 함께 공개합니다
        </h2>
        <div className="ks-qa-grid">
          <div className="ks-qa-card">
            <div className="ks-q">개인정보는 어떻게 다루나요?</div>
            <div className="ks-a">현재 입력 본문은 Gemini 요청에 포함될 수 있고, 데이터베이스 설정 시 Neon에 저장됩니다. 발표에서는 비식별 샘플을 사용하며, 보관·삭제 정책은 고도화 대상입니다.</div>
          </div>
          <div className="ks-qa-card">
            <div className="ks-q">ATS 점수가 실제 합격 가능성인가요?</div>
            <div className="ks-a">아닙니다. 구현된 키워드·경력·학력·밀도 휴리스틱의 비교 신호일 뿐 회사별 ATS나 채용 확률을 재현하지 않습니다. 점수보다 누락 단서와 원문을 확인하는 용도입니다.</div>
          </div>
          <div className="ks-qa-card">
            <div className="ks-q">실제 AI와 mock은 어떻게 구분하나요?</div>
            <div className="ks-a">실제 모드는 Gemini REST 호출과 환경변수를 사용합니다. testmockup 계정은 localStorage 인터셉터와 사전 응답을 사용하므로 실제 AI가 아니며, 시연 화면에 구분해 표시합니다.</div>
          </div>
          <div className="ks-qa-card">
            <div className="ks-q">경쟁사와 무엇이 다른가요?</div>
            <div className="ks-a">현재의 차별화 가설은 공고 분석, AI 수정, 사용자 Diff 승인을 한 흐름에 묶는 것입니다. 시장 우위나 경쟁사 대비 성과는 아직 검증하지 않았고, 경력 기록 연결을 다음 단계로 검증합니다.</div>
          </div>
        </div>
      </Slide>

      {/* SLIDE 10: CHECKLIST */}
      <Slide index={10} visible={current === 9}>
        <Tagline className="purple" time="04:50-05:00 · 10초">09 / 09 · 제출 전 확인사항</Tagline>
        <h2>발표 전 최종 체크리스트</h2>
        <div className="ks-checklist-grid">
          <div className="ks-checklist-item"><div className="ks-box" /><span>표지의 팀명과 발표자를 입력했는가? 현재 상태: 팀명 입력 필요 · 발표자 입력 필요</span></div>
          <div className="ks-checklist-item"><div className="ks-box" /><span>서비스 문제와 단일 타깃 페르소나, Pain 3개가 명확한가?</span></div>
          <div className="ks-checklist-item"><div className="ks-box" /><span>통계 3개의 출처명과 기준시점을 함께 표기했는가?</span></div>
          <div className="ks-checklist-item"><div className="ks-box" /><span>주요 기능을 ATS, 이력서 AI 개선·Diff, 텍스트 면접 3개로 설명했는가?</span></div>
          <div className="ks-checklist-item"><div className="ks-box" /><span>시연 순서가 /ats → /resume/[id] → /interview/[id]로 준비되었는가?</span></div>
          <div className="ks-checklist-item"><div className="ks-box" /><span>실제 AI 조건과 mock 대체 경로를 구분해 설명할 수 있는가?</span></div>
          <div className="ks-checklist-item"><div className="ks-box" /><span>실제 캡처가 없으면 가짜 이미지를 사용하지 않고 직접 시연하는가?</span></div>
           <div className="ks-checklist-item"><div className="ks-box" /><span>발표 본문 5분 배분을 지키고, 질의응답 5분 내외는 별도로 운영하는가?</span></div>
          <div className="ks-checklist-item"><div className="ks-box" /><span>현재 미구현인 지원 제출, 음성 면접, 오프라인 지원을 기능처럼 말하지 않았는가?</span></div>
          <div className="ks-checklist-item"><div className="ks-box" /><span>개인정보 입력·저장 조건과 ATS 점수의 한계를 질문에 답할 수 있는가?</span></div>
        </div>
        <p className="ks-final-note">제출 전 입력 필요: 발표자 입력 필요 · 팀명 입력 필요</p>
      </Slide>
    </div>
  );
}
