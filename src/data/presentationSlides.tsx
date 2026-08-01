'use client';

import React from 'react';

export const SLIDE_COUNT = 10;

export const SLIDE_CSS = `
.ks-root {
  position: fixed; inset: 0; z-index: 100;
  overflow: hidden;
  background: #0a0e27; color: #e2e8f0;
  font-family: 'Pretendard', 'Satoshi', system-ui, sans-serif;
  --title-size: clamp(1.5rem, 5vw, 4rem);
  --h2-size: clamp(1.25rem, 3.5vw, 2.5rem);
  --h3-size: clamp(1rem, 2.5vw, 1.75rem);
  --body-size: clamp(0.75rem, 1.5vw, 1.125rem);
  --small-size: clamp(0.65rem, 1vw, 0.875rem);
  --slide-padding: clamp(1rem, 4vw, 4rem);
  --content-gap: clamp(0.5rem, 2vw, 2rem);
  --element-gap: clamp(0.25rem, 1vw, 1rem);
}
@media (max-height: 700px) {
  .ks-root { --slide-padding: clamp(0.75rem, 3vw, 2rem); --content-gap: clamp(0.4rem, 1.5vw, 1rem); --title-size: clamp(1.25rem, 4.5vw, 2.5rem); --h2-size: clamp(1rem, 3vw, 1.75rem); }
}
@media (max-height: 600px) {
  .ks-root { --slide-padding: clamp(0.5rem, 2.5vw, 1.5rem); --content-gap: clamp(0.3rem, 1vw, 0.75rem); --title-size: clamp(1.1rem, 4vw, 2rem); --body-size: clamp(0.7rem, 1.2vw, 0.95rem); }
  .ks-nav-dots, .ks-keyboard-hint { display: none !important; }
}
@media (max-width: 600px) {
  .ks-root { --title-size: clamp(1.25rem, 7vw, 2.5rem); }
}
@media (prefers-reduced-motion: reduce) {
  .ks-root *, .ks-root *::before, .ks-root *::after { animation-duration: 0.01ms !important; transition-duration: 0.2s !important; }
}

.ks-slides-container {
  display: flex; flex-direction: column;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100vh; height: 100dvh;
}

.ks-slide {
  width: 100vw; height: 100vh; height: 100dvh; overflow: hidden;
  display: flex; flex-direction: column; position: relative; flex-shrink: 0;
  background: linear-gradient(135deg, #0a0e27 0%, #111640 40%, #0d1b3e 100%);
}
.ks-slide::before {
  content: ''; position: absolute; inset: 0;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(6, 182, 212, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(168, 85, 247, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 80%, rgba(59, 130, 246, 0.05) 0%, transparent 50%);
  pointer-events: none;
}
.ks-slide::after {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.5), rgba(168, 85, 247, 0.5), transparent);
}
.ks-slide[data-visible] { opacity: 1; }
.ks-slide:not([data-visible]) { opacity: 0; position: absolute; pointer-events: none; }

.ks-slide-content {
  flex: 1; display: flex; flex-direction: column; justify-content: center;
  max-height: 100%; overflow: hidden;
  padding: clamp(1rem, 4vw, 4rem);
}

.ks-slide-number {
  position: absolute; bottom: clamp(0.5rem, 2vw, 2rem); right: clamp(0.5rem, 2vw, 2rem);
  font-family: 'Clash Display', sans-serif; font-size: clamp(0.7rem, 1.5vw, 1rem);
  color: rgba(148, 163, 184, 0.5); letter-spacing: 0.1em; z-index: 10;
}

.ks-root h1 {
  font-family: 'Clash Display', sans-serif; font-size: var(--title-size);
  font-weight: 700; line-height: 1.1;
  background: linear-gradient(135deg, #06b6d4 0%, #a855f7 50%, #3b82f6 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.ks-root h2 {
  font-family: 'Clash Display', sans-serif; font-size: var(--h2-size); font-weight: 600;
  background: linear-gradient(135deg, #06b6d4, #a855f7);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text; margin-bottom: var(--element-gap);
}
.ks-root h3 { font-family: 'Clash Display', sans-serif; font-size: var(--h3-size); font-weight: 600; color: #e2e8f0; }
.ks-root p, .ks-root li { font-size: var(--body-size); line-height: 1.6; color: #94a3b8; }
.ks-root strong { color: #f1f5f9; font-weight: 600; }

.ks-subtitle {
  font-size: clamp(0.9rem, 1.8vw, 1.4rem); color: #64748b; margin-top: 0.5em;
  font-weight: 400;
}
.ks-tagline {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.4em 1em; border-radius: 999px;
  background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.2);
  font-size: var(--small-size); color: #67e8f9; margin-bottom: var(--content-gap);
}
.ks-tagline.cyan { background: rgba(6, 182, 212, 0.1); border-color: rgba(6, 182, 212, 0.2); color: #67e8f9; }
.ks-tagline.purple { background: rgba(168, 85, 247, 0.1); border-color: rgba(168, 85, 247, 0.2); color: #d8b4fe; }

.ks-badge {
  display: inline-block; padding: 0.2em 0.6em; border-radius: 6px;
  font-size: var(--small-size); font-weight: 500;
}
.ks-badge.cyan { background: rgba(6, 182, 212, 0.15); color: #67e8f9; border: 1px solid rgba(6, 182, 212, 0.2); }
.ks-badge.purple { background: rgba(168, 85, 247, 0.15); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.2); }
.ks-badge.blue { background: rgba(59, 130, 246, 0.15); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.2); }
.ks-badge.green { background: rgba(34, 197, 94, 0.15); color: #86efac; border: 1px solid rgba(34, 197, 94, 0.2); }
.ks-badge.amber { background: rgba(251, 191, 36, 0.15); color: #fde68a; border: 1px solid rgba(251, 191, 36, 0.2); }
.ks-badge.red { background: rgba(248, 113, 113, 0.15); color: #fca5a5; border: 1px solid rgba(248, 113, 113, 0.2); }

.ks-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: clamp(0.5rem, 1.5vw, 1rem); }
.ks-grid-3 { grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); }
.ks-grid-4 { grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr)); }

.ks-card {
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px; padding: clamp(0.8rem, 2vw, 1.5rem);
  backdrop-filter: blur(10px); transition: border-color 0.3s, transform 0.3s;
}
.ks-card:hover { border-color: rgba(6, 182, 212, 0.3); transform: translateY(-2px); }
.ks-card h3 { font-size: clamp(0.85rem, 1.5vw, 1.2rem); margin-bottom: 0.4em; }
.ks-card p, .ks-card li { font-size: clamp(0.65rem, 1.2vw, 0.9rem); color: #94a3b8; }
.ks-card .ks-stat {
  font-family: 'Clash Display', sans-serif; font-size: clamp(1.5rem, 4vw, 3rem);
  font-weight: 700; line-height: 1;
  background: linear-gradient(135deg, #06b6d4, #a855f7);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.ks-card .ks-stat-label { font-size: var(--small-size); color: #64748b; margin-top: 0.3em; }

.ks-stat-row { display: flex; gap: clamp(0.5rem, 2vw, 2rem); flex-wrap: wrap; justify-content: center; }
.ks-stat-item { text-align: center; padding: clamp(0.5rem, 1.5vw, 1rem); }
.ks-stat-item .ks-number {
  font-family: 'Clash Display', sans-serif; font-size: clamp(1.2rem, 3vw, 2.5rem);
  font-weight: 700;
}
.ks-stat-item .ks-number.red { color: #fca5a5; }
.ks-stat-item .ks-number.amber { color: #fde68a; }
.ks-stat-item .ks-number.cyan { color: #67e8f9; }
.ks-stat-item .ks-label { font-size: var(--small-size); color: #64748b; }

.ks-flow-arrow {
  display: flex; align-items: center; justify-content: center;
  font-size: clamp(1rem, 2vw, 1.5rem); color: #06b6d4;
}

.ks-tech-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));
  gap: clamp(0.4rem, 1vw, 0.75rem);
}
.ks-tech-item {
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px; padding: clamp(0.5rem, 1.2vw, 1rem);
  text-align: center;
}
.ks-tech-item .ks-name { font-size: clamp(0.7rem, 1.2vw, 0.9rem); font-weight: 600; color: #e2e8f0; }
.ks-tech-item .ks-desc { font-size: clamp(0.55rem, 0.9vw, 0.75rem); color: #64748b; margin-top: 0.2em; }

.ks-cover-logo {
  font-family: 'Clash Display', sans-serif; font-size: clamp(2rem, 6vw, 5rem);
  font-weight: 700; line-height: 1;
  background: linear-gradient(135deg, #06b6d4 0%, #a855f7 40%, #f59e0b 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}

.ks-highlight-box {
  border-left: 3px solid #06b6d4; padding: clamp(0.5rem, 1.5vw, 1rem) clamp(0.8rem, 2vw, 1.5rem);
  background: rgba(6, 182, 212, 0.05); border-radius: 0 12px 12px 0;
  margin-bottom: var(--element-gap);
}
.ks-highlight-box p { color: #cbd5e1; font-size: clamp(0.7rem, 1.3vw, 1rem); }

.ks-demo-frame {
  width: 100%; max-width: 800px; aspect-ratio: 16/9;
  border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.15);
  background: rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center;
  margin: 0 auto;
}
.ks-demo-frame p { font-size: var(--body-size); color: #64748b; }

.ks-checklist-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5em 0; }
.ks-checklist-item .ks-box {
  width: 1.2em; height: 1.2em; border: 2px solid rgba(148, 163, 184, 0.3);
  border-radius: 4px; flex-shrink: 0;
}

.ks-qa-card {
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px; padding: clamp(1rem, 3vw, 2.5rem);
  text-align: center; max-width: 600px; margin: 0 auto;
}
.ks-qa-card .ks-q { font-size: var(--h3-size); color: #e2e8f0; margin-bottom: 1em; }
.ks-qa-card .ks-a { font-size: var(--body-size); color: #94a3b8; line-height: 1.8; }

/* Navigation */
.ks-nav-dots {
  position: absolute; right: clamp(0.5rem, 2vw, 2rem); top: 50%; transform: translateY(-50%);
  display: flex; flex-direction: column; gap: 0.5rem; z-index: 200;
}
.ks-nav-dot {
  width: 10px; height: 10px; border-radius: 50%; border: none; cursor: pointer;
  background: rgba(148, 163, 184, 0.2); transition: all 0.3s; padding: 0;
}
.ks-nav-dot.active { background: #06b6d4; box-shadow: 0 0 12px rgba(6, 182, 212, 0.5); }
.ks-nav-dot:hover { background: rgba(6, 182, 212, 0.5); }

.ks-keyboard-hint {
  position: absolute; bottom: clamp(0.5rem, 2vw, 1.5rem); left: 50%; transform: translateX(-50%);
  font-size: clamp(0.5rem, 0.8vw, 0.75rem); color: rgba(148, 163, 184, 0.3);
  z-index: 200; letter-spacing: 0.1em; text-align: center;
  display: flex; align-items: center; gap: 0.75rem;
}
.ks-keyboard-hint kbd {
  display: inline-block; padding: 0.15em 0.5em; border-radius: 4px;
  background: rgba(148, 163, 184, 0.1); border: 1px solid rgba(148, 163, 184, 0.2);
  font-size: inherit; font-family: inherit;
}

/* Branding (existing page harmony) */
.ks-brand {
  position: absolute; top: clamp(0.5rem, 2vw, 1.5rem); left: clamp(0.5rem, 2vw, 1.5rem);
  display: flex; align-items: center; gap: 0.6rem; z-index: 200;
}
.ks-brand-name {
  font-family: 'Clash Display', sans-serif; font-weight: 700;
  font-size: clamp(0.9rem, 1.5vw, 1.15rem); color: #e2e8f0; letter-spacing: 0.02em;
  display: inline-flex; align-items: center; gap: 0.5rem;
}
.ks-brand-badge {
  font-size: clamp(0.55rem, 0.9vw, 0.7rem); color: #67e8f9;
  border: 1px solid rgba(6, 182, 212, 0.3); background: rgba(6, 182, 212, 0.1);
  padding: 0.2em 0.7em; border-radius: 999px; letter-spacing: 0.05em;
}
.ks-dashboard-link {
  position: absolute; top: clamp(0.5rem, 2vw, 1.5rem); right: clamp(0.5rem, 2vw, 1.5rem);
  z-index: 200;
}
`;

function Tagline({
  className = '',
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <span className={`ks-tagline ${className}`} style={style}>
      {children}
    </span>
  );
}

function Badge({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <span className={`ks-badge ${className}`}>{children}</span>;
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

export default function PresentationSlides({ current }: { current: number }) {
  return (
    <div id="slides-container" className="ks-slides-container" style={{ transform: `translateY(-${current * 100}%)` }}>
      {/* SLIDE 1: COVER */}
      <Slide index={1} visible={current === 0} contentStyle={{ alignItems: 'center', textAlign: 'center' }}>
        <Tagline style={{ marginBottom: 'clamp(1rem,3vw,2rem)' }}>
          2026 SW미래채움 × AI·SW중심대학 연합 경진대회
        </Tagline>
        <div className="ks-cover-logo">Kairos</div>
        <h1 style={{ fontSize: 'clamp(1.2rem,3vw,2.2rem)', marginTop: '0.3em' }}>AI Career Operating System</h1>
        <p className="ks-subtitle" style={{ marginTop: 'clamp(0.5rem,2vw,1.5rem)' }}>
          AI로 커리어의 결정적 순간을 포착하다
        </p>
        <div
          style={{
            marginTop: 'clamp(1rem,3vw,2.5rem)',
            display: 'flex',
            gap: 'clamp(0.5rem,2vw,2rem)',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Badge className="cyan">트랙: AI 서비스톤</Badge>
          <Badge className="purple">팀: Kairos</Badge>
          <Badge className="blue">서비스: kairos.service.rhee.life</Badge>
        </div>
        <p style={{ marginTop: 'clamp(1.5rem,4vw,3rem)', fontSize: 'var(--small-size)', color: '#475569' }}>
          발표자: (팀원명) · 2026
        </p>
      </Slide>

      {/* SLIDE 2: SERVICE OVERVIEW */}
      <Slide index={2} visible={current === 1}>
        <Tagline>01 / 09 · 서비스 개요</Tagline>
        <h2>
          AI가 대신하는
          <br />
          커리어 전략
        </h2>
        <p style={{ maxWidth: 720, marginBottom: 'var(--content-gap)' }}>
          Kairos는 <strong>Google Gemini AI</strong>와 <strong>pgvector 시맨틱 검색</strong>으로 이력서 분석, 모의면접,
          ATS 최적화를 하나의 플랫폼에서 제공합니다.
        </p>
        <div className="ks-grid" style={{ marginTop: 'var(--element-gap)' }}>
          <div className="ks-card" style={{ textAlign: 'center' }}>
            <div className="ks-stat">3</div>
            <div className="ks-stat-label">
              단계 이력서 개선
              <br />
              Draft → Evaluate → Improve
            </div>
          </div>
          <div className="ks-card" style={{ textAlign: 'center' }}>
            <div className="ks-stat">SSE</div>
            <div className="ks-stat-label">
              실시간 AI 모의면접
              <br />
              스트리밍 응답 + 피드백
            </div>
          </div>
          <div className="ks-card" style={{ textAlign: 'center' }}>
            <div className="ks-stat">1536</div>
            <div className="ks-stat-label">
              차원 pgvector
              <br />
              경력 시맨틱 검색
            </div>
          </div>
          <div className="ks-card" style={{ textAlign: 'center' }}>
            <div className="ks-stat">4</div>
            <div className="ks-stat-label">
              레이어 AI 가드레일
              <br />
              안전한 LLM 운영
            </div>
          </div>
        </div>
      </Slide>

      {/* SLIDE 3: PROBLEM BACKGROUND */}
      <Slide index={3} visible={current === 2}>
        <Tagline className="red">02 / 09 · 문제 배경</Tagline>
        <h2>
          청년 고용 위기,
          <br />
          더 이상 개인의 문제가 아니다
        </h2>
        <div className="ks-stat-row" style={{ marginBottom: 'var(--content-gap)' }}>
          <div className="ks-stat-item">
            <div className="ks-number red">6.1%</div>
            <div className="ks-label">
              청년 실업률 (2025)
              <br />
              3년만에 최고치
            </div>
          </div>
          <div className="ks-stat-item">
            <div className="ks-number amber">48.5만</div>
            <div className="ks-label">
              &apos;쉬었음&apos; 청년
              <br />
              역대 최대 규모
            </div>
          </div>
          <div className="ks-stat-item">
            <div className="ks-number cyan">17.4%</div>
            <div className="ks-label">
              체감 실업률
              <br />
              확장실업률 기준
            </div>
          </div>
          <div className="ks-stat-item">
            <div className="ks-number red">22개월</div>
            <div className="ks-label">
              청년 고용률
              <br />
              연속 하락
            </div>
          </div>
        </div>
        <div className="ks-grid ks-grid-3">
          <div className="ks-card">
            <h3>🏢 미스매치</h3>
            <p>
              청년 34.1%가 <strong>&quot;원하는 일자리가 없어서&quot;</strong> 구직 포기.
              <br />
              정보통신업 구직자 과잉 vs 건설업 인력 부족.
            </p>
            <p style={{ marginTop: '0.5em', fontSize: 'var(--small-size)', color: '#64748b' }}>
              출처: 한국노동연구원 (2026)
            </p>
          </div>
          <div className="ks-card">
            <h3>🤖 AI 대체</h3>
            <p>
              AI 도입으로 <strong>신입 채용 수요 감소</strong>, 경력직 선호 심화.
              <br />
              중견기업 경력직 채용 비중 20.6% → 25.2%.
            </p>
            <p style={{ marginTop: '0.5em', fontSize: 'var(--small-size)', color: '#64748b' }}>
              출처: 한국일보 고용24 분석
            </p>
          </div>
          <div className="ks-card">
            <h3>⏳ 취업 지연</h3>
            <p>
              첫 취업까지 평균 <strong>11.5개월</strong> (역대 최장).
              <br />
              졸업 후 1년 이상 미취업 46.6%.
            </p>
            <p style={{ marginTop: '0.5em', fontSize: 'var(--small-size)', color: '#64748b' }}>
              출처: 국가데이터처
            </p>
          </div>
        </div>
      </Slide>

      {/* SLIDE 4: KEY FEATURES */}
      <Slide index={4} visible={current === 3}>
        <Tagline className="purple">03 / 09 · 주요 기능</Tagline>
        <h2>
          커리어 전 생애를
          <br />
          6가지 AI 도구로
        </h2>
        <div className="ks-grid ks-grid-3" style={{ marginTop: 'var(--element-gap)' }}>
          <div className="ks-card">
            <h3>📄 Resume Studio</h3>
            <p>
              3-stage 파이프라인: Draft → LLM Evaluate → STAR Improve. 변경사항 Diff 확인 및 1-Click 적용.
            </p>
          </div>
          <div className="ks-card">
            <h3>🎤 Mock Interview</h3>
            <p>SSE 실시간 스트리밍 면접. 난이도별 질문 생성, 답변 평가, 점수 피드백.</p>
          </div>
          <div className="ks-card">
            <h3>📊 ATS Analyzer</h3>
            <p>80+ 스킬, 7개 카테고리 기반 JD 매칭. 키워드 분석 및 맞춤형 개선 추천.</p>
          </div>
          <div className="ks-card">
            <h3>✍️ Text Humanizer</h3>
            <p>AI 생성 텍스트를 자연스러운 인간 어체로 변환. 스타일 점수 + 변경사항 요약.</p>
          </div>
          <div className="ks-card">
            <h3>💬 Q&A Generator</h3>
            <p>직무별 맞춤 면접 질문 + 모범 답변 + 핵심 포인트 + 난이도 자동 생성.</p>
          </div>
          <div className="ks-card">
            <h3>🔍 Semantic Search</h3>
            <p>pgvector 1536차원 임베딩. 경력·이력서·커리어 데이터 시맨틱 검색.</p>
          </div>
        </div>
      </Slide>

      {/* SLIDE 5: USER FLOW */}
      <Slide index={5} visible={current === 4}>
        <Tagline>04 / 09 · 사용자 이용 흐름</Tagline>
        <h2>
          로그인부터 취업 성공까지,
          <br />
          5단계
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5,1fr)',
            gap: 'clamp(0.3rem,1vw,1rem)',
            marginTop: 'var(--element-gap)',
          }}
        >
          <div className="ks-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(1.5rem,4vw,3rem)', marginBottom: '0.3em' }}>🔐</div>
            <h3 style={{ fontSize: 'clamp(0.75rem,1.2vw,1rem)' }}>1단계</h3>
            <p style={{ fontSize: 'clamp(0.6rem,0.9vw,0.85rem)' }}>
              회원가입 / 로그인
              <br />
              Email · Google · Web3 Wallet
            </p>
          </div>
          <div className="ks-flow-arrow">→</div>
          <div className="ks-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(1.5rem,4vw,3rem)', marginBottom: '0.3em' }}>📝</div>
            <h3 style={{ fontSize: 'clamp(0.75rem,1.2vw,1rem)' }}>2단계</h3>
            <p style={{ fontSize: 'clamp(0.6rem,0.9vw,0.85rem)' }}>
              이력서 업로드 / 작성
              <br />
              PDF · DOCX · HWP 지원
            </p>
          </div>
          <div className="ks-flow-arrow">→</div>
          <div className="ks-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(1.5rem,4vw,3rem)', marginBottom: '0.3em' }}>🤖</div>
            <h3 style={{ fontSize: 'clamp(0.75rem,1.2vw,1rem)' }}>3단계</h3>
            <p style={{ fontSize: 'clamp(0.6rem,0.9vw,0.85rem)' }}>
              AI 분석 / 개선
              <br />
              ATS 평가 · STAR 재작성
            </p>
          </div>
          <div className="ks-flow-arrow">→</div>
          <div className="ks-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(1.5rem,4vw,3rem)', marginBottom: '0.3em' }}>🎯</div>
            <h3 style={{ fontSize: 'clamp(0.75rem,1.2vw,1rem)' }}>4단계</h3>
            <p style={{ fontSize: 'clamp(0.6rem,0.9vw,0.85rem)' }}>
              모의면접 / Q&A
              <br />
              SSE 실시간 트레이닝
            </p>
          </div>
          <div className="ks-flow-arrow">→</div>
          <div className="ks-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(1.5rem,4vw,3rem)', marginBottom: '0.3em' }}>🚀</div>
            <h3 style={{ fontSize: 'clamp(0.75rem,1.2vw,1rem)' }}>5단계</h3>
            <p style={{ fontSize: 'clamp(0.6rem,0.9vw,0.85rem)' }}>
              취업 성공
              <br />
              커리어 관리 지속
            </p>
          </div>
        </div>
        <div className="ks-highlight-box" style={{ marginTop: 'var(--element-gap)', maxWidth: 600, alignSelf: 'center' }}>
          <p>
            <strong>완전한 Offline 지원</strong> — PWA + IndexedDB + 오프라인 큐로 네트워크 없이도 핵심 기능 사용 가능
          </p>
        </div>
      </Slide>

      {/* SLIDE 6: TECH ARCHITECTURE */}
      <Slide index={6} visible={current === 5}>
        <Tagline className="purple">05 / 09 · AI·SW 활용 구조</Tagline>
        <h2>
          Dual-Framework
          <br />
          AI 네이티브 아키텍처
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'clamp(0.5rem,1.5vw,1.5rem)',
            marginTop: 'var(--element-gap)',
          }}
        >
          <div>
            <div className="ks-tech-grid">
              <div className="ks-tech-item">
                <div className="ks-name">Next.js 15</div>
                <div className="ks-desc">App Router + RSC</div>
              </div>
              <div className="ks-tech-item">
                <div className="ks-name">React 19</div>
                <div className="ks-desc">Server + Client Components</div>
              </div>
              <div className="ks-tech-item">
                <div className="ks-name">Gemini 2.0</div>
                <div className="ks-desc">Flash + Embedding 004</div>
              </div>
              <div className="ks-tech-item">
                <div className="ks-name">NeonDB</div>
                <div className="ks-desc">pgvector 1536d</div>
              </div>
              <div className="ks-tech-item">
                <div className="ks-name">Drizzle ORM</div>
                <div className="ks-desc">PostgreSQL 스키마</div>
              </div>
              <div className="ks-tech-item">
                <div className="ks-name">Vercel AI</div>
                <div className="ks-desc">Gateway + Blob</div>
              </div>
              <div className="ks-tech-item">
                <div className="ks-name">vectra</div>
                <div className="ks-desc">IndexedDB 로컬 벡터 검색</div>
              </div>
              <div className="ks-tech-item">
                <div className="ks-name">Payload CMS</div>
                <div className="ks-desc">관리자 대시보드</div>
              </div>
            </div>
          </div>
          <div className="ks-card" style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.3rem,0.8vw,0.75rem)' }}>
            <h3 style={{ fontSize: 'clamp(0.75rem,1.2vw,1rem)' }}>🔐 4-Layer Guardrail</h3>
            <p style={{ fontSize: 'clamp(0.6rem,0.9vw,0.8rem)' }}>Input → Context → Output → Loop</p>
            <h3 style={{ fontSize: 'clamp(0.75rem,1.2vw,1rem)', marginTop: '0.5em' }}>☁️ Multi-Platform</h3>
            <p style={{ fontSize: 'clamp(0.6rem,0.9vw,0.8rem)' }}>
              Web · Tauri Desktop · React Native Mobile · Chrome/VS Code Extension
            </p>
            <h3 style={{ fontSize: 'clamp(0.75rem,1.2vw,1rem)', marginTop: '0.5em' }}>🌐 i18n</h3>
            <p style={{ fontSize: 'clamp(0.6rem,0.9vw,0.8rem)' }}>한국어 (default) · 영어</p>
            <h3 style={{ fontSize: 'clamp(0.75rem,1.2vw,1rem)', marginTop: '0.5em' }}>🧪 Testing</h3>
            <p style={{ fontSize: 'clamp(0.6rem,0.9vw,0.8rem)' }}>Vitest · 9개 서비스 테스트 · 561 lines</p>
          </div>
        </div>
      </Slide>

      {/* SLIDE 7: DEMO */}
      <Slide index={7} visible={current === 6}>
        <Tagline>06 / 09 · 프로토타입 시연</Tagline>
        <h2>실시간 서비스 시연</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'clamp(0.5rem,1.5vw,1.5rem)',
            marginTop: 'var(--element-gap)',
          }}
        >
          <div className="ks-card">
            <h3>📄 Resume Studio</h3>
            <p style={{ marginTop: '0.3em' }}>이력서 업로드 → AI 평가 → STAR 개선 → Diff 확인 → 1-Click 적용</p>
            <div style={{ marginTop: '0.5em', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Badge className="green">구현 완료</Badge>
              <Badge className="cyan">SSR: false</Badge>
            </div>
          </div>
          <div className="ks-card">
            <h3>🎤 Mock Interview</h3>
            <p style={{ marginTop: '0.3em' }}>직무 선택 → AI 질문 생성 → SSE 실시간 응답 → 평가 점수</p>
            <div style={{ marginTop: '0.5em', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Badge className="green">구현 완료</Badge>
              <Badge className="purple">SSE Streaming</Badge>
            </div>
          </div>
          <div className="ks-card">
            <h3>📊 ATS Analyzer</h3>
            <p style={{ marginTop: '0.3em' }}>JD 입력 → 80+ 스킬 매칭 → 점수 + 키워드 분석 + 추천</p>
            <div style={{ marginTop: '0.5em', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Badge className="green">구현 완료</Badge>
              <Badge className="amber">No LLM (Pure Alg)</Badge>
            </div>
          </div>
          <div className="ks-card">
            <h3>🔍 Semantic Search</h3>
            <p style={{ marginTop: '0.3em' }}>pgvector 1536d 임베딩 → 코사인 유사도 → 경력 검색</p>
            <div style={{ marginTop: '0.5em', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Badge className="green">구현 완료</Badge>
              <Badge className="cyan">pgvector</Badge>
            </div>
          </div>
        </div>
        <div className="ks-highlight-box" style={{ marginTop: 'var(--element-gap)' }}>
          <p>
            <strong>접속 경로:</strong>{' '}
            <a href="https://kairos.service.rhee.life" target="_blank" style={{ color: '#67e8f9' }}>
              kairos.service.rhee.life
            </a>{' '}
            · 데모 계정: testmockup / 12345
          </p>
        </div>
      </Slide>

      {/* SLIDE 8: IMPACT & PLANS */}
      <Slide index={8} visible={current === 7}>
        <Tagline className="purple">07 / 09 · 기대효과 및 확장계획</Tagline>
        <h2>
          개인을 넘어
          <br />
          사회로
        </h2>
        <div className="ks-grid ks-grid-3" style={{ marginTop: 'var(--element-gap)' }}>
          <div className="ks-card" style={{ textAlign: 'center' }}>
            <h3>🎯 기대효과</h3>
            <p style={{ marginTop: '0.5em' }}>
              AI 기반 커리어 코칭으로 <strong>취업 준비 기간 단축</strong>
              <br />
              개인 맞춤형 스킬 갭 분석으로 <strong>효율적 역량 개발</strong>
              <br />
              데이터 기반 커리어 의사결정 지원
            </p>
          </div>
          <div className="ks-card" style={{ textAlign: 'center' }}>
            <h3>📱 확장계획</h3>
            <p style={{ marginTop: '0.5em' }}>
              <strong>Mobile:</strong> React Native (Expo) STT/TTS 면접
              <br />
              <strong>Desktop:</strong> Tauri v2 네이티브 HWP 편집
              <br />
              <strong>Extension:</strong> Chrome DOM 파서 · VS Code 커밋 요약
            </p>
          </div>
          <div className="ks-card" style={{ textAlign: 'center' }}>
            <h3>🌍 사회적 가치</h3>
            <p style={{ marginTop: '0.5em' }}>
              <strong>청년 고용률 제고</strong> — 고용 미스매치 해소
              <br />
              <strong>지역 인재 양성</strong> — 공공데이터 기반 스킬갭 분석
              <br />
              <strong>지속가능성</strong> — 평생 커리어 관리 플랫폼
            </p>
          </div>
        </div>
      </Slide>

      {/* SLIDE 9: Q&A */}
      <Slide index={9} visible={current === 8} contentStyle={{ alignItems: 'center', textAlign: 'center' }}>
        <Tagline>08 / 09 · 질의응답</Tagline>
        <div className="ks-qa-card">
          <div className="ks-q">궁금하신 점을 자유롭게 질문해 주세요</div>
          <div className="ks-a">
            <p>Kairos는 여러분의 커리어 여정을 AI와 함께합니다.</p>
            <p style={{ marginTop: '1em', fontSize: 'var(--small-size)', color: '#475569' }}>
              발표 내용에 대해 질문해 주시면 성실히 답변드리겠습니다.
            </p>
          </div>
        </div>
      </Slide>

      {/* SLIDE 10: CHECKLIST */}
      <Slide index={10} visible={current === 9}>
        <Tagline className="purple">09 / 09 · 제출 전 확인사항</Tagline>
        <h2>발표자 체크리스트</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--content-gap)',
            marginTop: 'var(--element-gap)',
            maxWidth: 800,
          }}
        >
          <div>
            <div className="ks-checklist-item">
              <div className="ks-box" />
              <span>서비스 문제와 타깃 사용자가 명확한가?</span>
            </div>
            <div className="ks-checklist-item">
              <div className="ks-box" />
              <span>주요 기능과 사용자 흐름이 구체적인가?</span>
            </div>
            <div className="ks-checklist-item">
              <div className="ks-box" />
              <span>프로토타입 또는 시연물이 확인 가능한가?</span>
            </div>
          </div>
          <div>
            <div className="ks-checklist-item">
              <div className="ks-box" />
              <span>발표 시간 기준에 맞게 구성되었는가? (5분+Q&amp;A 5분)</span>
            </div>
            <div className="ks-checklist-item">
              <div className="ks-box" />
              <span>예선/본선 모두 활용 가능하도록 팀 정보 정확 기재</span>
            </div>
            <div className="ks-checklist-item">
              <div className="ks-box" />
              <span>사회 문제 인식 · 통계 근거 · 공익성 입증 완료</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 'var(--content-gap)', textAlign: 'center', fontSize: 'var(--small-size)', color: '#475569' }}>
          감사합니다. — Kairos 팀
        </div>
      </Slide>
    </div>
  );
}
