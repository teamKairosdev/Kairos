# ⚡ KAIROS — 마스터 계획서 (Master Plan)

> **작성일**: 2026-07-29  
> **버전**: v1.0 — 초초 베타 비전 완전 정의  
> **근거 자료**: s5 세션 로그, 전략방향성.md, 심사기준.md, ideas-2026-07-29.md, s4.1 감사 결과  
> **작성자**: AI 에이전트 (Antigravity) + 프로젝트 오너 통합

---

## 목차

1. [정체성과 이름의 의미](#1-정체성과-이름의-의미)
2. [비전 선언문 — 이건 AI 자소서가 아니다](#2-비전-선언문)
3. [전체 기능 구조 (5대 핵심 도메인)](#3-전체-기능-구조)
4. [플랫폼 전략 — Web·Mobile·Desktop·Web3](#4-플랫폼-전략)
5. [기술 아키텍처 전체](#5-기술-아키텍처)
6. [외부 연동 에이전트 생태계](#6-외부-연동-에이전트-생태계)
7. [수익 모델 — 자동마진장치 & 결제](#7-수익-모델)
8. [데이터 영속성 & 클라우드 전략](#8-데이터-영속성--클라우드-전략)
9. [현재 프로젝트 상태 (Phase 0-8 완료 기준)](#9-현재-프로젝트-상태)
10. [단기 로드맵 (실서비스 전환)](#10-단기-로드맵)
11. [중장기 비전 로드맵](#11-중장기-비전-로드맵)
12. [Web3 블록체인 결제 — 초초 베타 계획](#12-web3-블록체인-결제)
13. [디자인 원칙 & 메타포](#13-디자인-원칙--메타포)
14. [보완 필요 사항 (AI가 자동으로 채운 빠진 항목들)](#14-보완-필요-사항)

---

## 1. 정체성과 이름의 의미

### KAIROS(카이로스)란?

> **카이로스(Καιρός)** — 고대 그리스어로 "결정적인 순간", "결정적인 시간"을 의미한다.  
> 전능하신 하나님(여호와)의 수직적인 신성한 시간 개념 — 크로노스(Chronos, 물리적 시간)와 대비되는 개념으로, 기회가 열리는 바로 그 순간이다.

이 이름이 의미하는 바:

- **사람의 인생에서 결정적 기회는 준비된 자에게 온다** — Kairos는 그 준비를 완전하게 해주는 플랫폼이다.
- **메타포: 우주, 무채색, 긴 여정** — 광활하고 차분하며 깊다. 화려하지 않지만 무겁고 진지하다.
- **개인의 대시보드이자 창작의 땅** — 개인이 자신의 커리어, 창작물, 업무, 지식을 한곳에 모으는 공간이다.

---

## 2. 비전 선언문

> **"Kairos는 AI 자소서 서비스가 아니다."**  
> **"이것은 개인의 대시보드이자, Art of Creative, Land of Creative Art다."**  
> **"Genspark와 같은 진짜 AI 서비스다."**

### Kairos가 해결하는 진짜 문제

인간에게는 수많은 경험과 지식이 있다. 그러나 **막상 기회가 왔을 때 그것들을 꺼내 말과 글로 풀어내기가 어렵다**.

- 이력서를 쓰려 하면 내가 무엇을 했는지 생각이 안 난다
- AI에게 자소서를 맡기면 AI 냄새가 난다
- 업무 자동화 도구는 너무 많고 파편화되어 있다
- 창작 작업도, 법적 문서도, 이미지도, 게임도 — 모두 다른 도구를 써야 한다
- 에이전트는 있지만, 내 삶 전체를 대리하는 에이전트는 없다

**Kairos는 이 모든 것을 하나의 공간에서 해결한다.**

### 3대 핵심 정체성 축

| 축 | 비유 | 설명 |
|----|------|------|
| **커리어 OS** | Notion + Obsidian | 사용자의 커리어 전 생애를 지식 베이스로 구조화, 연결, 추적 |
| **커리어 SNS** | Threads + X(Twitter) | 성장자극 소셜 네트워크 — 취업준비생-면접관-기업 연결 |
| **AI 에이전트 오케스트레이터** | 다중 에이전트 시스템 | 데이터 기반 분석, 예측, 조언 — MCP + 로컬/웹 에이전트 활용 |

---

## 3. 전체 기능 구조

Kairos는 **5대 핵심 도메인**으로 구성된다.

---

### 3.1 커리어 개발 관리 (Career Development Hub)

> "자신의 많은 경험과 지식들, 막상 어느 기회에 지원하려고 하면 생각이 안 나고 어떻게 말과 글로 풀어내야 할지 모르는 법이다."

#### 기능 목록

**A. AI 이력서 고도화 파이프라인**
- PDF/DOCX/HWP/HWPX 업로드 → 브라우저 파싱 (pdfjs-dist + mammoth + HWP 파서)
- 3단계 LLM 체인: `Draft → Evaluate → Improve`
- 정량적 성과 중심 자동 재작성
- ATS 최적화 키워드 자동 삽입
- 이력서 버전 관리 (히스토리 저장)

**B. AI 모의 면접 (CUI + 시각화)**
> "CUI도 지원하되 그것은 주된 것이 아니게 작아야 하며, 그 CUI조차도 AI의 thinking 과정, 프로세싱 메시지 과정이 다 보여야 한다."
- SSE 스트리밍 실시간 면접관 LLM
- **AI 내부 thinking 과정 시각적 표시** (thinking bubble, 처리 단계 UI)
- 면접 유형: 고졸전형 / 대졸전형 / 경력자 전용 / 직종별
- 다중 난이도: 주니어 / 미들 / 시니어 / 임원급
- STAR 프레임워크 기반 답변 유도
- 면접 영상/음성 녹화 (Web RTC) → 자동 분석

**C. ATS 채용공고 매칭 분석**
- JD(채용공고) vs 이력서 실시간 비교
- ATS 필터링 통과율 예측 스코어
- 필수 키워드 갭 분석 (found vs missing)
- 경쟁률 기반 합격 확률 예측

**D. AI 문장 휴머나이저**
- AI 특유의 진부한 어조 제거
- 피동형 → 능동형 자동 변환
- 자연스러운 인간 문체로 리라이팅
- 자연스러움 지수(Score) 표시

**E. 예상 면접 Q&A 플래시카드**
- 직무 + 경력 기반 맞춤형 Q&A 세트 생성
- 모범답변 + 핵심 키워드 포함
- 플래시카드 형태로 반복 학습

**F. 온라인 문서 편집 스튜디오**
> "hwp 파일도 엑셀도 조작이 되고"
- **HWP / HWPX** 편집 (한글 문서 포맷 지원 — LibreOffice WebAssembly 또는 자체 파서)
- **DOC / DOCX** 편집 (mammoth + ProseMirror 기반)
- **XLSX / CSV** 편집 (SheetJS 기반 스프레드시트 에디터)
- **PDF** 뷰어 + 주석 (pdfjs-dist)
- 온라인 저장 및 클라우드 동기화

**G. 온라인 포토샵 스튜디오**
- 이력서용 증명사진 보정
- 배경 제거 (AI Segment Anything Model)
- 기본 이미지 편집 도구 (Fabric.js 또는 Canvas API 기반)
- AI 이미지 생성 (이력서 포트폴리오용 이미지)

**H. 커리어 지식 베이스**
- 개인의 경험, 프로젝트, 기술 스택을 Notion처럼 구조화
- 태그, 카테고리, 링크로 연결
- pgvector 시맨틱 검색으로 관련 경험 자동 연결
- 이력서/자소서 작성 시 자동 참조

---

### 3.2 업무 자동화 (Workflow Automation Hub)

> "Make, n8n, Google Opal 등과 연동 및 자체 기능"

#### 기능 목록

**A. 외부 자동화 도구 연동**
- **Make (Integromat)** 연동 — Webhook 기반 트리거/액션
- **n8n** 셀프호스팅 연동
- **Zapier** 연동
- **Google Opal** (AI 워크플로우) 연동

**B. 자체 워크플로우 빌더**
- 드래그앤드롭 노드 기반 자동화 편집기
- 트리거: 이력서 업로드, 면접 완료, 점수 도달, 날짜/시간
- 액션: AI 분석 실행, 이메일 발송, 슬랙 알림, DB 저장

**C. 채용공고 자동 수집 & 매칭**
- 워크넷, 고용24, 잡코리아, 링크드인 채용공고 자동 수집 (MCP 서버 크롤링)
- 내 프로필/이력서와 자동 매칭
- 적합 공고 발견 시 자동 알림

**D. 이메일 자동화**
- 자동 메일 발송 (Gmail API 연동)
- 사용량 초과 자동 알림 메일 (자동마진장치 연동)
- 채용공고 마감 알림

---

### 3.3 배포 & 개발 (Dev & Deploy Hub)

> "원스탑 게임개발 기능"

#### 기능 목록

**A. 원스탑 게임 개발**
- AI 기반 게임 아이디어 → 코드 생성
- Phaser.js / PixiJS / Three.js 기반 웹 게임 개발 환경
- 빌드 & 배포 원클릭 (Vercel / Cloudflare Pages)

**B. 웹 앱 원스탑 개발 & 배포**
- AI 코딩 에이전트로 코드 생성 (Claude Code 스타일)
- GitHub 연동 (push/pull/merge)
- CI/CD 파이프라인 자동 설정
- Vercel/Netlify 배포 자동화

**C. 코드 리뷰 & 개선**
- 커밋된 코드 자동 AI 리뷰
- 보안 취약점 스캔
- 성능 최적화 제안

---

### 3.4 미술 창작 (Creative Art Studio)

> "일러스트레이션, 로고 및 기타 모든 미술"

#### 기능 목록

**A. AI 이미지 생성**
- Stable Diffusion / DALL-E / Midjourney API 연동
- 스타일: 일러스트레이션, 사실적, 만화, 로고, UI 목업
- 프롬프트 템플릿 라이브러리

**B. 벡터 로고 생성**
- AI 기반 SVG 로고 생성
- 브랜드 컬러 팔레트 자동 생성
- 명함, 간판 등 적용 목업 생성

**C. 포트폴리오 갤러리**
- 창작물 클라우드 저장
- 공개/비공개 설정
- 고유 URL 생성 (챗GPT처럼 — 옵션 공개)
- 임베드 코드 제공

**D. AI 디자인 보조**
- 배너, 썸네일, 카드 자동 생성
- 이력서 PDF 디자인 템플릿 적용

---

### 3.5 업무 대리 에이전트 (Autonomous Agent Hub)

> "Claude Cowork 같이 개발 진짜 Agent, 결제와 구매 등 모든 작업까지"

#### 기능 목록

**A. 개발 에이전트 (OpenCode 스타일)**
- 자연어 명령 → 코드 작성 → 실행 → 결과 반환
- 파일 시스템 접근 (데스크탑 앱에서)
- 터미널 명령 실행
- 브라우저 자동화 (Playwright 기반)

**B. 결제 & 구매 대리 에이전트**
- 온라인 쇼핑 자동 구매 (특정 조건 충족 시)
- 구독 서비스 관리 (갱신/취소 자동화)
- 최저가 탐색 후 구매 트리거

**C. 웹 리서치 에이전트**
- 특정 주제 자동 조사 → 보고서 생성
- 실시간 정보 수집 (뉴스, 논문, 포럼)
- Perplexity 스타일 인용 기반 답변

**D. MCP(Model Context Protocol) 에이전트 허브**
- Kakao Play MCP 연동
- OpenClaw MCP 연동
- Hermes Agent 연동
- OpenCode 연동
- 로컬 에이전트 ↔ 웹 에이전트 브릿지

---

## 4. 플랫폼 전략

### 4.1 멀티 플랫폼 계획

| 플랫폼 | 기술 스택 | 상태 | 비고 |
|--------|-----------|------|------|
| **웹 (SPA)** | Nuxt.js 4 + Vercel | ✅ 프로토타입 완료 | 메인 채널 |
| **모바일 앱** | Capacitor (iOS/Android) | 🔜 예정 | 웹 코드 재사용 |
| **데스크탑 프로그램** | Electron | 🔜 예정 | 로컬-first 기능 |
| **브라우저 확장** | Chrome Extension API | 🔮 고려 | 채용공고 자동 스크래핑 |

### 4.2 웹 SPA (현재)

- **Nuxt.js 4** — SPA 모드 (`ssr: false`), Vercel 서버리스 배포
- **Neon DB** — PostgreSQL + pgvector (서버리스)
- **Cloudflare R2 / Vercel Blob** — 파일 스토리지 (이력서, 이미지)
- 이유: 빠른 프로토타이핑, 비용 최소화, 글로벌 엣지 배포

### 4.3 모바일 앱 (Capacitor)

- 기존 Nuxt SPA를 Capacitor로 래핑
- 네이티브 기능: 파일 접근, 카메라, 알림, 생체인증
- iOS App Store / Google Play 배포
- Push Notification (채용공고 알림, 면접 일정 알림)

### 4.4 데스크탑 (Electron)

반드시 Electron으로 가야 하는 이유:

| 기능 | Web 한계 | Desktop 장점 |
|------|----------|--------------|
| 로컬 파일 접근 | 업로드 필요 | 네이티브 파일 시스템 접근 |
| 오프라인 AI | WebGPU 제약 | 로컬 GPU 활용 (GGUF 모델) |
| CLI 실행 | 불가능 | subprocess 호출 |
| HWP 편집 | 브라우저 제약 | LibreOffice 내장 가능 |
| 시스템 트레이 | 불가 | OS 네이티브 알림 |
| 보안 (민감 이력서) | 클라우드 전송 | 로컬-first 처리 |

---

## 5. 기술 아키텍처

### 5.1 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                             │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Web SPA  │  │ Mobile App   │  │ Desktop (Electron) │   │
│  │ Nuxt 4   │  │ Capacitor    │  │ Electron + Nuxt    │   │
│  └────┬─────┘  └──────┬───────┘  └────────┬───────────┘   │
└───────┼────────────────┼──────────────────┼───────────────┘
        │                │                  │
        └────────────────┴──────────────────┘
                         │
                    [HTTPS / WSS]
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    SERVER LAYER (Nitro + Vercel)             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Better Auth    │  Rate Limiting   │  API Routes         │ │
│  │  (HttpOnly 쿠키) │  (Upstash Redis) │  (Nitro Handlers)   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   AI LAYER                               │ │
│  │  AI SDK v7 (Multi-model routing)                         │ │
│  │  ├── Anthropic Claude (primary, 90% cost reduction)      │ │
│  │  ├── OpenAI GPT-4 (fallback)                             │ │
│  │  ├── Google Gemini (multimodal)                          │ │
│  │  └── Cloudflare Workers AI (open source fallback)        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              AGENT ORCHESTRATION LAYER                   │ │
│  │  MCP Server Hub (Model Context Protocol)                 │ │
│  │  ├── Kakao Play MCP                                      │ │
│  │  ├── OpenClaw MCP                                        │ │
│  │  ├── Hermes Agent                                        │ │
│  │  ├── OpenCode                                            │ │
│  │  ├── Make / n8n / Zapier Webhooks                        │ │
│  │  └── Public API Connectors (워크넷, 고용24, etc.)        │ │
│  └─────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    DATA LAYER                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │  Neon PostgreSQL │  │ Cloudflare R2   │  │ Upstash     │  │
│  │  + pgvector      │  │ (파일 스토리지)  │  │ Redis Cache │  │
│  │  (Drizzle ORM)   │  │ Vercel Blob     │  │ (Rate Limit)│  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  CLIENT-SIDE STORAGE (브라우저/로컬)                       │ │
│  │  IndexedDB (채팅 히스토리, 오프라인 큐, 벡터 검색)           │ │
│  │  vectra/browser (로컬 벡터 검색)                           │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 5.2 현재 기술 스택 (Phase 0-8 완료)

| 카테고리 | 기술 | 버전 |
|---------|------|------|
| **프레임워크** | Nuxt.js | 4.5.1 |
| **UI** | Vue.js | 3.5.40 |
| **라우터** | Vue Router | 5.0.0 |
| **컴포넌트** | Nuxt UI | 4.10.0 |
| **CSS** | Tailwind CSS | 4.x |
| **AI SDK** | ai (Vercel AI SDK) | 7.0.32 |
| **AI 프로바이더** | @ai-sdk/openai / anthropic / google | 4.0.0 |
| **인증** | better-auth | 1.6.x |
| **DB ORM** | drizzle-orm | 0.45.2 |
| **DB** | Neon PostgreSQL + pgvector | — |
| **캐시/RateLimit** | Upstash Redis | 2.0 / 1.38 |
| **문서 파싱** | pdfjs-dist + mammoth | 6.1 / 1.12 |
| **임베딩** | @huggingface/transformers | 4.2 |
| **로컬 벡터 검색** | vectra/browser | 0.15 |
| **PWA** | @vite-pwa/nuxt | — |
| **배포** | Vercel (서버리스) | — |

### 5.3 8개 클라이언트 컴포저블

| 컴포저블 | 역할 |
|---------|------|
| `useClientAI` | 브라우저에서 직접 AI 호출 |
| `useLocalATS` | 로컬 ATS 키워드 분석 |
| `useDocumentParser` | PDF/DOCX 브라우저 파싱 |
| `useLocalVectorSearch` | IndexedDB + vectra 로컬 벡터 검색 |
| `useLocalLLM` | web-llm 로컬 LLM 실행 |
| `useAuth` | Better Auth 세션 관리 |
| `useChatHistory` | IndexedDB 채팅 히스토리 |
| `useOfflineQueue` | 오프라인 작업 큐 (서비스워커) |

---

## 6. 외부 연동 에이전트 생태계

> "모든 로컬 및 웹 에이전트 및 정보원천과 연결이 가능하도록 한다."

### 6.1 MCP (Model Context Protocol) 허브

MCP는 AI 에이전트가 외부 도구/서비스와 표준화된 방식으로 연결하는 프로토콜이다.

```
Kairos MCP Server Hub
├── 채용 정보 소스
│   ├── 워크넷 MCP (공공 채용공고)
│   ├── 고용24 MCP (고용노동부)
│   ├── 산업인력공단 MCP
│   └── 링크드인 MCP (스크래핑)
│
├── 생산성 도구 연동
│   ├── Google Drive MCP (파일 동기화)
│   ├── Notion MCP (지식 베이스 연동)
│   ├── Obsidian MCP (로컬 노트 연동)
│   └── Kakao Play MCP
│
├── 자동화 도구
│   ├── Make (Integromat) Webhook
│   ├── n8n 셀프호스팅 연동
│   ├── Zapier Webhook
│   └── Google Opal
│
└── 에이전트 프레임워크
    ├── OpenClaw MCP
    ├── Hermes Agent
    └── OpenCode
```

### 6.2 에이전트 아키텍처 (다중 에이전트 오케스트레이션)

```
사용자 입력 (자연어)
    │
    ▼
[Orchestrator Agent — Kairos Brain]
    │
    ├─→ Agent A: 이력서 분석 에이전트
    │       ├── tool: parse_document (HWP/PDF/DOCX)
    │       ├── tool: ats_analyze (채용공고 JD 비교)
    │       └── tool: pgvector_search (유사 이력서 참조)
    │
    ├─→ Agent B: 채용공고 수집 에이전트
    │       ├── tool: worknet_search (워크넷 MCP)
    │       ├── tool: web_scrape (기업 채용 페이지)
    │       └── tool: match_profile (내 프로필과 비교)
    │
    ├─→ Agent C: 면접 준비 에이전트
    │       ├── tool: generate_qa (직무별 Q&A 생성)
    │       ├── tool: simulate_interview (SSE 스트리밍 면접)
    │       └── tool: evaluate_answer (STAR 프레임워크 평가)
    │
    ├─→ Agent D: 업무 자동화 에이전트
    │       ├── tool: trigger_make (Make 워크플로우)
    │       ├── tool: send_email (Gmail API)
    │       └── tool: schedule_task (cron 등록)
    │
    └─→ Agent E: 구매/결제 대리 에이전트
            ├── tool: web_browse (Playwright)
            ├── tool: fill_form (자동 양식 작성)
            └── tool: payment_execute (결제 실행)
```

---

## 7. 수익 모델 — 자동마진장치 & 결제

### 7.1 결제 시스템

**일반 결제 (Stripe)**
- 구독 플랜: Free / Pro / Enterprise
- 사용량 기반 과금 (Pay-as-you-go)
- 카드 결제, 카카오페이, 네이버페이 연동

**Web3 블록체인 결제 (초초 베타 기능)**
→ [12장 참조](#12-web3-블록체인-결제)

### 7.2 플랜 구조

| 플랜 | 가격 | AI 토큰 한도 | 에이전트 | 스토리지 |
|------|------|------------|---------|---------|
| **Free** | 무료 | 50k 토큰/월 | 기본 | 100MB |
| **Pro** | ₩9,900/월 | 500k 토큰/월 | 3개 | 5GB |
| **Team** | ₩29,900/월 | 2M 토큰/월 | 10개 | 20GB |
| **Enterprise** | 문의 | 무제한 | 무제한 | 무제한 |

### 7.3 자동마진장치 (Auto-Margin System)

> "B2B든 B2C든 사용량 기반으로 적자가 나지 않도록 자동사용량판정장치가 작동하고 자동메일 발송기능"

**작동 원리:**

```
사용자 사용량 실시간 모니터링
    │
    ├── 경고 1 (80% 도달): 사용자에게 "곧 한도 초과" 알림 이메일
    │
    ├── 경고 2 (100% 도달): 기능 제한 + 업그레이드 유도 이메일
    │
    └── 초과 시 처리:
            ├── 구독 사용자: 추가 사용량 자동 과금 (설정값에 따라)
            ├── 무료 사용자: 해당 기능 잠금 (다음 달 초 리셋)
            └── 기업 사용자: 관리자에게 자동 청구서 이메일 발송
```

**설정 가능 파라미터:**
- 과금 임계값 설정 (관리자가 조정)
- 자동 결제 허용/차단 여부
- 알림 이메일 발송 시점 (50%, 80%, 100%)
- 초과분 단가 설정

**비용 보호 장치:**
- LLM 호출 비용 실시간 추적 (`@ai-sdk/otel` 연동)
- Anthropic `cacheControl` 적용 (입력비용 -90%)
- Redis 시맨틱 캐시로 중복 요청 차단
- 모델 라우팅 (비용 낮은 모델 우선 시도)
- 월별 손익 대시보드 (관리자 전용)

### 7.4 B2B 기업 요금

- 기업용 멀티시트 계정
- 면접관 계정 별도 관리
- 사용량 보고서 자동 생성 및 이메일 발송
- SLA (서비스 수준 협약)

---

## 8. 데이터 영속성 & 클라우드 전략

> "챗GPT에서 채팅하면 고유 URL이 생성되며 웹상에 어떤 형태로든 게시되는 것처럼, 클라우드에서 영속성이 유지되도록도 옵션해야 한다."

### 8.1 콘텐츠 영속성 (퍼블리싱)

| 콘텐츠 유형 | 기본 상태 | 퍼블리시 옵션 | URL 형식 |
|------------|---------|-------------|---------|
| 채팅/AI 대화 | 비공개 | 공개 링크 생성 | `kairos.app/share/{uuid}` |
| 면접 결과 | 비공개 | 공개 포트폴리오 | `kairos.app/u/{username}/interview/{id}` |
| 이력서 | 비공개 | 고유 URL 링크 생성 | `kairos.app/resume/{uuid}` |
| 창작물 갤러리 | 비공개 | 공개 갤러리 | `kairos.app/u/{username}/gallery` |
| 커리어 프로필 | 선택 | LinkedIn처럼 공개 | `kairos.app/u/{username}` |

### 8.2 파일 스토리지 전략

**1단계 (현재): Vercel Blob**
- 이력서, 이미지, 문서 저장
- CDN 자동 적용

**2단계 (확장): Cloudflare R2**
- 대용량 파일 (HWP, 포트폴리오, 영상)
- 비용 효율적 (Cloudflare R2 는 Egress 무료)
- Workers AI와 연동 가능

### 8.3 DB 스키마 (현재 + 확장 계획)

```sql
-- 현재 구축된 테이블
users              -- Better Auth 기본 (sessions, accounts 포함)
resumes            -- 이력서 + 고도화 히스토리
resume_refinements -- 이력서 버전별 고도화 기록
interviews         -- 모의 면접 세션
ats_results        -- ATS 분석 결과
career_entries     -- 커리어 경험 지식베이스 (pgvector)

-- 확장 예정 테이블
profiles           -- 사용자 확장 프로필 (직종, 기술스택, 희망직무)
messages           -- 1:1 메시지 (면접관 ↔ 지원자)
posts              -- 커뮤니티 게시글
comments           -- 댓글
likes              -- 좋아요
company_posts      -- 기업 채용공고 게시판
agent_sessions     -- 에이전트 실행 세션 로그
billing_records    -- 사용량 / 결제 기록
```

---

## 9. 현재 프로젝트 상태

### Phase 0-8 완료 현황 (2026-07-29 기준)

| Phase | 내용 | 상태 |
|-------|------|:----:|
| **0** | 보안 패치 (Drizzle CVE), 시크릿 제거, Docker 정리 | ✅ |
| **1** | Nuxt 3→4, Nuxt UI v4, Tailwind v4, 6개 패키지 제거 | ✅ |
| **2** | AI SDK v4→v7, 8개 클라이언트 컴포저블 신규 | ✅ |
| **3** | Better Auth 완전 전환 (JWT/HMAC 제거) | ✅ |
| **4** | Neon Serverless DB, Upstash Rate Limiting | ✅ |
| **5** | Anthropic cacheControl (비용 -90%), Redis 캐시 | ✅ |
| **6** | PWA, 서비스워커, 오프라인 큐, IndexedDB | ✅ |
| **7** | 문서 파싱 클라이언트 전환, LLM API 라우트 | ✅ |
| **8** | Nuxt UI v4 컴포넌트 마이그레이션, Glassmorphism | ✅ |

### 현재 빌드 상태

```
✅ npm run build — PASS (Nuxt 4.5.1, Nitro 2.13.4, Vite 8.1.5)
✅ TypeScript strict mode 통과
✅ Vercel 배포 가능 상태
⚠️ BUILD WARN: llmCache nitro.alias 누락 (중요도: 중)
```

### 구현된 페이지

| 경로 | 기능 |
|------|------|
| `/` | 대시보드 홈 |
| `/resume` | 이력서 목록 + 신규 등록 |
| `/resume/[id]` | 이력서 상세 + 고도화 |
| `/interview` | 모의 면접 세션 목록 |
| `/interview/[id]` | 면접 채팅 (SSE 스트리밍) |
| `/ats` | ATS 채용공고 매칭 분석 |
| `/humanizer` | AI 문장 휴머나이저 |
| `/qa` | Q&A 플래시카드 생성기 |
| `/career` | 커리어 지식베이스 |
| `/auth/login` | 로그인 |
| `/auth/register` | 회원가입 |

### 지금 당장 실서비스가 안 되는 이유 (10가지 갭)

| # | 항목 | 현황 | 필요한 것 |
|---|------|------|---------|
| P1 | **테스트** | 0% | vitest 단위 + playwright E2E |
| P2 | **모니터링** | 미연동 | @ai-sdk/otel 활성화 + Sentry |
| P3 | **CI/CD** | 없음 | GitHub Actions 파이프라인 |
| P4 | **OAuth** | 이메일만 | 구글/카카오 소셜 로그인 |
| P5 | **SEO** | SPA 한계 | 공개 페이지 SSR/prerender |
| P6 | **에러 UI** | alert() | UToast + error.vue |
| P7 | **접근성** | 미검증 | WCAG AA 대비 + 키보드 네비 |
| P8 | **i18n** | 한국어 고정 | @nuxtjs/i18n 도입 |
| P9 | **비용 튜닝** | 미조정 | 실사용량 기반 모델 라우팅 |
| P10 | **성능** | 미측정 | LCP/FCP, 청크 분할 최적화 |

---

## 10. 단기 로드맵 (실서비스 전환)

### Sprint 1 (즉시 — 1주일)

**긴급 버그 수정:**
- [ ] `nuxt.config.ts` — `llmCache` nitro.alias 추가
- [ ] `vercel.json` — `rewrites` 블록 제거
- [ ] `server/api/llm/refine.post.ts` — `setCachedResponse` 누락 추가
- [ ] `server/api/llm/chat.post.ts` — 미사용 import 제거
- [ ] `.env.example` — `GOOGLE_API_KEY` 추가, `JWT_SECRET` 주석 처리

**기반 인프라:**
- [ ] GitHub Actions CI/CD 파이프라인 구축
- [ ] 에러 핸들링: `alert()` → `useToast()` 전환
- [ ] 전역 에러 바운더리 (`error.vue`)

### Sprint 2 (2-3주)

**핵심 기능 안정화:**
- [ ] Better Auth OAuth: 구글 + 카카오 소셜 로그인
- [ ] 프로필 생성 시스템 (필수 온보딩 플로우)
- [ ] vitest 핵심 서비스 단위 테스트 추가
- [ ] @ai-sdk/otel 모니터링 활성화

### Sprint 3 (4-6주)

**신규 기능:**
- [ ] 면접 유형별 세분화 (고졸/대졸/경력자)
- [ ] 통합 검색 시스템 (pgvector 기반)
- [ ] 메시지 기능 (1:1)
- [ ] PWA 푸시 알림 (채용공고 알림)

### Sprint 4 (7-10주)

**플랫폼 확장:**
- [ ] 커뮤니티 시스템 (게시판, 댓글, 좋아요)
- [ ] 기업 채용공고 게시판 (캐러셀 UI)
- [ ] HWP/HWPX 편집 기능
- [ ] Stripe 결제 연동 + 자동마진장치

---

## 11. 중장기 비전 로드맵

### Phase A: 실서비스 전환 (0-6개월)

**목표**: 1명의 사용자가 30분 동안 가치를 느끼게 하는 것

- SPA 데모 → 실서비스 전환 (P1-P10 완료)
- 핵심 루프 완성: `이력서 → 면접 → ATS → 피드백`
- 초기 사용자 100명 확보
- 수익 모델 1.0: 구독 결제 시작

### Phase B: 플랫폼 성장 (6-12개월)

**목표**: 커뮤니티 + 데이터 축적 시작

- MCP 서버로 외부 데이터 연결 (워크넷, 고용24)
- Electron 데스크탑 앱 v1.0 출시
- 커뮤니티 → 데이터 모이기 시작 → 네트워크 효과
- B2B 기업용 인터뷰 관리 패널
- Capacitor 모바일 앱 출시 (iOS/Android)
- MCP 에이전트 허브 오픈

### Phase C: AI 에이전트 생태계 (12-24개월)

**목표**: 데이터 moat 형성, 에이전트 마켓플레이스

- AI 에이전트 마켓플레이스 (MCP 기반 사용자 제작 에이전트 거래)
- 커리어 예측 엔진 (데이터 기반 퇴사/이직/승진 예측)
- SNS 효과 완성: 팔로우, 피드, 커리어 인증 배지
- 글로벌 확장 (i18n, 해외 채용 시장 — 일본, 동남아 우선)
- Web3 결제 정식 출시

### Phase D: 플랫폼 생태계 완성 (24개월+)

**목표**: 커리어 OS로서의 독점적 데이터 보유

- 독점 데이터 레이어:
  - 면접 평가 결과 누적 → 채용 트렌드 분석
  - 지원자-기업 매칭 데이터 → 인재 추천 엔진
  - 커뮤니티 데이터 → LLM fine-tuning 데이터
- 커리어 경력 예측 모델 (AI 기반)
- 기업 HR 통합 솔루션

---

## 12. Web3 블록체인 결제

> "추후에는 Web3 기술인 Solidity도 적용해서 블록체인 기반 결제도 가능하도록 베타의 초초 베타 기능도 도입할 생각이다."

### 12.1 개요

Web3 결제는 **초초 베타** 기능으로, 실험적 옵션이다. 일반 결제(Stripe)와 병행 운영.

### 12.2 기술 스택

| 컴포넌트 | 기술 |
|---------|------|
| 스마트 컨트랙트 | Solidity (EVM 호환) |
| 배포 체인 | Polygon (이더리움 L2 — 가스비 저렴) |
| 지갑 연동 | ethers.js + MetaMask / WalletConnect |
| NFT (선택) | ERC-721 (커리어 인증 배지) |
| 결제 토큰 | USDC, MATIC |

### 12.3 스마트 컨트랙트 설계 (개념)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract KairosSubscription {
    // 구독 플랜별 결제
    mapping(address => SubscriptionPlan) public subscriptions;
    mapping(address => uint256) public tokenBalance;
    
    // AI 토큰 구매 (사용량 기반 과금)
    function purchaseTokens(uint256 amount) external payable;
    
    // 구독 갱신 (월별 자동 갱신 — Gelato Network 자동화)
    function renewSubscription(address user) external;
    
    // 초과 사용량 자동 결제
    function chargeOverage(address user, uint256 amount) external;
}
```

### 12.4 Web3 결제 사용자 플로우

```
1. 사용자가 지갑 연결 (MetaMask / WalletConnect)
2. USDC 잔액으로 구독권 구매 → 스마트 컨트랙트 실행
3. 구독 상태 온체인 기록 → Kairos 서버에서 검증
4. 만료 7일 전 Gelato 자동화로 갱신 트랜잭션 트리거
5. 커리어 인증 배지 NFT 발행 (면접 통과 시)
```

### 12.5 로드맵

| 단계 | 내용 | 시점 |
|------|------|------|
| 초초 베타 | Polygon 테스트넷 배포, 지갑 연결 UI | Phase B |
| 베타 | 메인넷 배포, USDC 결제 | Phase C |
| 정식 | NFT 인증 배지, 자동 갱신 | Phase D |

---

## 13. 디자인 원칙 & 메타포

### 13.1 비주얼 메타포: 우주

> "이것의 메타포는 마치 우주다. 무채색, 긴 여정과도 같다."

- **색상**: 무채색 기반 — 검은 우주 공간, 희미한 별빛, 차가운 보라/인디고
- **질감**: Glassmorphism (반투명 유리 패널, 별빛 반사)
- **움직임**: 느리고 우아한 애니메이션, 스타필드 배경
- **분위기**: 진중하고 깊이 있음. 화려하지 않지만 압도적임.

### 13.2 현재 디자인 시스템

**컬러 팔레트:**

| 이름 | 색상 | 사용 |
|------|------|------|
| Void Black | `#0a0a0f` | 배경 최심층 |
| Deep Space | `#0f0f1a` | 패널 배경 |
| Nebula Purple | `#7c3aed` | 주요 액션, 강조 |
| Stellar Indigo | `#4f46e5` | 보조 액션 |
| Cosmic Cyan | `#06b6d4` | 면접, 정보 |
| Starlight | `rgba(255,255,255,0.05-0.15)` | Glassmorphism |

**커스텀 CSS 클래스:**

| 클래스 | 설명 |
|--------|------|
| `.glass-panel` | 주요 Glassmorphism 컨테이너 |
| `.glass-card` | 카드형 Glassmorphism |
| `.gradient-text` | 보라→인디고 그라디언트 텍스트 |

### 13.3 UX 철학: Trust (신뢰)

취업 데이터는 개인에게 가장 민감한 정보 중 하나. 

| 원칙 | 방법 |
|------|------|
| **투명성** | AI 판단 근거 표시 (confidence score, 참조 데이터, thinking 과정 가시화) |
| **컨트롤** | 데이터 공유 범위 세밀하게 제어 |
| **일관성** | Glassmorphism + Kairos Design System |
| **속도** | 모든 화면 1초 이내, SSE 스트리밍 + skeleton UI |

### 13.4 CUI (Chat User Interface) 설계 원칙

> "CUI 조차도 AI의 thinking 과정, 프로세싱 메시지 과정이 다 보여야 한다."
> "CUI는 주된 것이 아니게 작아야 하며"

- CUI는 **서브 기능** — 전면에 내세우지 않고, 보조적으로 항상 접근 가능
- AI thinking 버블 표시 (생각 중 → 분석 중 → 답변 생성 중)
- SSE 스트리밍으로 글자 하나씩 실시간 렌더링
- 처리 단계 진행 표시 (step 1/3, 2/3, 3/3 등)
- CUI 결과물에도 공유 URL 옵션

---

## 14. 보완 필요 사항

> AI가 자동으로 채워 넣은 — 사용자가 말했지만 상세화되지 않은 항목들

### 14.1 HWP/HWPX 파일 편집 전략

한국의 표준 문서 포맷. 구현 난이도가 높다.

**옵션 1**: LibreOffice WebAssembly 빌드 (`lo-wasm`) — 완전한 HWP 지원 but 번들 크기 300MB+
**옵션 2**: HWP 전용 오픈소스 파서 (`hwp.js`) — 읽기는 가능, 쓰기 제한
**옵션 3**: 서버사이드 변환 — HWP → DOCX 변환 후 mammoth 처리

**권장**: 단기는 옵션 3 (서버 변환), 장기는 옵션 1 (WebAssembly)

### 14.2 영상/음성 면접 기능

웹에서 영상 면접 시뮬레이션:

- `getUserMedia()` API로 카메라/마이크 접근
- Web RTC (WebSockets or Agora.io) 실시간 스트리밍
- Whisper API (음성 → 텍스트 변환)
- 표정/자세 분석: MediaPipe FaceMesh (AI)
- 영상 녹화 저장: MediaRecorder API → Cloudflare R2

### 14.3 MCP 서버 자체 구축

Kairos 서비스 자체를 MCP 서버로 노출:

```json
// kairos-mcp.json
{
  "name": "kairos",
  "tools": [
    { "name": "analyze_resume", "description": "이력서를 ATS 분석" },
    { "name": "generate_qa", "description": "면접 Q&A 생성" },
    { "name": "search_careers", "description": "커리어 지식베이스 검색" }
  ]
}
```

→ Claude Desktop, ChatGPT 플러그인, 다른 AI 에이전트가 Kairos를 도구로 사용 가능

### 14.4 SNS 기능 상세 설계

> "Threads/X-like 성장자극 플랫폼"

| 기능 | 설명 |
|------|------|
| 피드 | 팔로우한 사람의 면접 합격 소식, 커리어 마일스톤 |
| 커리어 인증 배지 | 면접 합격/취업 성공 시 플랫폼 인증 배지 (NFT 연동 가능) |
| 성장 타임라인 | 내 커리어 연대기 공개/비공개 설정 |
| 반응 | 좋아요, 응원해요, 북마크 |
| 멘토-멘티 연결 | 경력자가 취준생을 멘토링 |

### 14.5 보안 & 개인정보 정책

민감한 커리어 데이터 처리:

- **데이터 최소화**: 필요 없는 데이터는 수집하지 않음
- **암호화**: 이력서 본문은 AES-256 암호화 저장
- **로컬-first**: 가능하면 브라우저에서만 처리 (클라우드 전송 최소화)
- **삭제 권리**: 사용자가 모든 데이터 완전 삭제 가능
- **GDPR 대응**: 데이터 내보내기 기능 (JSON/CSV)

### 14.6 AI 윤리 & 환각 방지

- pgvector 기반 RAG: 사실 기반 검색으로 환각 최소화
- 사용자 피드백 루프: 좋음/나쁨 평가로 지속 개선
- 인용 표시: AI 답변에 참조 데이터 출처 표시
- Confidence Score: AI 판단의 신뢰도 수치 표시

### 14.7 접근성 (a11y) 요구사항

- WCAG AA 기준 준수
- 키보드 네비게이션 완전 지원
- 스크린 리더 호환 (ARIA 레이블)
- 고대비 모드 옵션
- 다크모드/라이트모드 전환

---

## 부록: 현재 코드베이스 마이너 이슈 (즉시 수정 대상)

병렬 에이전트 감사에서 발견된 항목 — Sprint 1에서 처리:

| 우선순위 | 파일 | 이슈 |
|---------|------|------|
| MEDIUM | `nuxt.config.ts` | `llmCache` nitro.alias 누락 |
| MEDIUM | `server/api/llm/refine.post.ts` | 캐시 쓰기(`setCachedResponse`) 누락 |
| LOW | `vercel.json` | `rewrites` 블록 Nitro 충돌 가능 |
| LOW | `server/api/llm/chat.post.ts` | 미사용 import 2개 |
| LOW | `server/api/interviews/[id]/chat.post.ts` | `asc` 미사용 import |
| LOW | `server/services/llmCache.ts` | `invalidateCache` 데드 파라미터 |
| LOW | `.env.example` | `GOOGLE_API_KEY` 누락 |
| LOW | `.env.example` / `docker-compose.yml` | `JWT_SECRET` 미사용 잔존 |

---

> **이 문서의 결론**:  
> Kairos는 AI 자소서 서비스가 아니다.  
> **커리어 OS + 커리어 SNS + AI 에이전트 오케스트레이터 + 창작 스튜디오 + 업무 자동화 + 배포/개발 허브**  
> 이 모든 것이 하나의 우주 같은 공간에 모여 있는 "개인의 대시보드"이자 "Art of Creative, Land of Creative Art"다.  
>  
> **결정적인 순간(Kairos)은 준비된 자에게 온다.**

---

*최종 수정: 2026-07-29 | 문서 버전: v1.0*
