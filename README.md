# Kairos: AI-Driven Career Operating System

> **"당신의 커리어 전 생애를 기억하고, 분석하고, 대신 행동하는 AI"**

Kairos는 **Next.js 15 (App Router)** 단일 프레임워크로 구축된 AI 기반 커리어 관리 플랫폼입니다. **Google Gemini REST API를 직접 호출**(AI SDK 미사용)하며, **NeonDB (PostgreSQL + pgvector)**, **Vercel Blob**을 활용해 이력서 분석/개선, AI 모의면접, ATS 호환성 검사, 문장 휴머나이저, 경력 시맨틱 검색, HWP/HWPX 문서 편집 등을 제공합니다.

- **프레임워크**: Next.js 15 (App Router) · React 19 · TypeScript (strict)
- **AI**: Google Gemini 2.0 Flash · text-embedding-004 · Imagen 3.0 (직접 REST 구현)
- **DB**: NeonDB (PostgreSQL + pgvector 1536d) · Drizzle ORM
- **문서**: HWP/HWPX 뷰어·에디터 (@rhwp core/editor, WASM)

---

## System Architecture

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor': '#2563eb', 'primaryTextColor': '#fff', 'primaryBorderColor': '#1d4ed8', 'lineColor': '#94a3b8', 'secondaryColor': '#f0f9ff', 'tertiaryColor': '#f8fafc', 'clusterBkg': '#f1f5f9', 'clusterBorder': '#cbd5e1', 'nodeBorder': '#475569', 'nodeTextColor': '#1e293b'}}}%%
flowchart TB
    subgraph Client["<b>Client Layer</b>"]
        direction TB
        NEXT["<b>Next.js 15 App</b><br/>React 19 · 20 Pages<br/>Resume · Interview · ATS · Docs · Community · Studio"]
        HWP["<b>HWP Runtime</b><br/>@rhwp/core WASM (rhwp_bg.wasm)<br/>@rhwp/editor iframe Studio"]
        DEMO["<b>Demo Mode</b><br/>localStorage mock 데이터<br/>(testmockup 계정 · DB 미설정 폴백)"]
    end

    subgraph Edge["<b>Edge / API Layer</b>"]
        direction TB
        MW["<b>middleware.ts</b><br/>JWT Session Guard<br/>10 Protected Paths"]
        API["<b>Route Handlers</b><br/>48 Routes · getSession 검증<br/>http.ts 공통 에러 응답"]
    end

    subgraph Services["<b>Service Layer (src/server)</b>"]
        direction TB
        LLM_SVC["<b>llm.ts</b><br/>callLLMText · callLLMStructured<br/>streamLLMText · llmCache"]
        DOMAIN["Domain Services<br/>resume · interview · ats · qa · humanizer<br/>career · companyMeta · skillGap · docs"]
        AUTH_SVC["auth · mfa · getSession<br/>guardrail 4-Layer"]
    end

    subgraph AI["<b>AI / LLM Layer</b>"]
        direction TB
        GEMINI["<b>Google Gemini</b><br/>generateContent · SSE Stream<br/>embedContent · Imagen predict"]
        GATEWAY["<b>Vercel AI Gateway</b><br/>(선택 · env 설정 시 활성)"]
    end

    subgraph Storage["<b>Storage Layer</b>"]
        NEON[("<b>NeonDB</b><br/>PostgreSQL + pgvector<br/>1536d embeddings · 16 tables")]
        BLOB[("<b>Vercel Blob</b><br/>File Storage")]
        LOCAL[("<b>Local FS</b><br/>uploads/ · uploads/studio/")]
    end

    NEXT --> MW
    MW --> API
    API --> Services
    LLM_SVC -->|"REST 직접 호출"| GEMINI
    LLM_SVC -.->|"선택"| GATEWAY
    Services --> NEON
    Services --> BLOB
    Services --> LOCAL
    NEXT --- HWP
    NEXT --- DEMO

    classDef primary fill:#2563eb,color:#fff,stroke:#1d4ed8
    classDef secondary fill:#f0f9ff,stroke:#93c5fd,color:#1e40af
    classDef accent fill:#fef3c7,stroke:#f59e0b,color:#92400e
    classDef storage fill:#f0fdf4,stroke:#86efac,color:#166534
    class NEXT,HWP,DEMO primary
    class MW,API secondary
    class LLM_SVC,DOMAIN,AUTH_SVC,GEMINI,GATEWAY accent
    class NEON,BLOB,LOCAL storage
```

---

## Tech Stack

| Category | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) · React 19 · TypeScript (strict) |
| **AI / LLM** | Google Gemini 2.0 Flash · **직접 REST 구현** (`src/server/llm.ts`, AI SDK 미사용) |
| **Embedding** | Google text-embedding-004 (1536d, `embedding.ts`) |
| **Image** | Google Imagen 3.0 (`imageGen.ts`, `studio/*`) |
| **Database** | NeonDB (PostgreSQL) · Drizzle ORM · pgvector (1536d) |
| **Auth** | JWT (jose, `kairos_session` 쿠키) · Google OAuth2 · Web3 Wallet (viem) · TOTP MFA (otplib + qrcode) |
| **Storage** | Vercel Blob · Local filesystem (uploads/, HWP/DOCX/PDF) |
| **HWP 문서** | @rhwp/core + @rhwp/editor (WASM, 브라우저 전용) · hwplib-js (서버 파싱) |
| **파일 파싱** | pdfjs-dist · mammoth (DOCX) |
| **Styling** | Tailwind CSS v4 (CSS-first, @theme) · Freesentation 폰트 |
| **Validation** | zod (LLM 구조화 응답 스키마) |
| **UI 유틸** | sonner (토스트) · diff (단어 diff 렌더) |
| **Testing** | Vitest (7개 테스트 파일 · 55 tests) |
| **Deploy** | Vercel (icn1 서울 리전) · `.npmrc` legacy-peer-deps |

---

## Core Features

| Feature | Description | Key Module |
|---|---|---|
| **Resume Studio** | 3단계 파이프라인: Draft → LLM 평가 → STAR 개선 (diff 뷰 + 대화형 AI 에이전트) | `resume/*` · `llm.ts` |
| **AI Mock Interview** | 컨텍스트 윈도우 + plain-text SSE 스트리밍 면접관, 실시간 평가 | `interview/*` · `context.ts` · `useChat.ts` |
| **ATS Analyzer** | JD 키워드 매칭 (40개 스킬 분류, 카테고리 가중치, 순수 알고리즘) | `ats.ts` |
| **Text Humanizer** | AI 문체 → 자연 한국어 변환 + 문체 점수 | `humanizer.ts` · LLM Structured |
| **Q&A Generator** | 직무별 면접 질문/모범답변 세트 생성 | `qa.ts` · LLM Structured |
| **Career Semantic Search** | pgvector 1536d 코사인 유사도 경력 검색 | `embedding.ts` · `career.ts` |
| **Company Intelligence** | 회사 WLB/문화/연봉 분석 (24h 캐시) | `companyMeta.ts` |
| **AI Photo Studio** | Imagen 3.0 이미지 생성 + 업로드 갤러리 | `imageGen.ts` · `studio/*` |
| **HWP/HWPX 문서** | 서버 텍스트 추출(업로드 영속화) · 웹 뷰어(SVG 페이지) · 웹 에디터(저장) | `HwpViewer.tsx` · `HwpEditor.tsx` · `hwpParser.ts` |
| **Shareable Chat** | 채팅 세션 저장 → `/r/:id` 공개 공유 | `chat/*` |
| **MCP Manifest** | AI 에이전트용 MCP 도구 매니페스트 (외부 클라이언트용) | `mcp.ts` |

---

## LLM Architecture (직접 REST 구현)

AI SDK(`ai`, `@ai-sdk/*`)를 사용하지 않고, **Google Gemini REST API를 직접 호출**하는 `src/server/llm.ts`가 모든 LLM 기능의 유일한 진입점입니다. zod 스키마를 OpenAPI `responseSchema`로 변환해 JSON 모드 구조화 응답을 받습니다.

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor': '#059669', 'primaryBorderColor': '#047857', 'lineColor': '#94a3b8', 'secondaryColor': '#f0fdf4', 'tertiaryColor': '#dbeafe', 'clusterBkg': '#f8fafc', 'clusterBorder': '#e2e8f0'}}}%%
flowchart LR
    subgraph API["<b>Route Handlers (src/app/api)</b>"]
        LLM_CHAT["llm/chat (캐시)"]
        LLM_STREAM["llm/stream"]
        LLM_REFINE["llm/refine (캐시)"]
        INT_CHAT["interviews/[id]/chat"]
        RES_REFINE["resumes/[id]/refine"]
        RES_CHAT["resumes/[id]/chat"]
        QA["qa/generate"]
        HUMAN["humanizer/process"]
        STUDIO["studio/generate"]
        CAREER["careers/search"]
        COMPANY["company/meta (24h 캐시)"]
        SKILLGAP["public/skill-gap (24h 캐시)"]
    end

    subgraph Services["<b>Service Modules (src/server)</b>"]
        LLM_SVC["llm.ts<br/>callLLMText · callLLMStructured · streamLLMText<br/>zod → OpenAPI · llmCache.ts"]
        EMB["embedding.ts<br/>generateEmbedding"]
        IMG["imageGen.ts<br/>generateStudioImage"]
        QA_SVC["qa.ts"]
        HUMAN_SVC["humanizer.ts"]
        RESUME_SVC["resumes/* (라우트 직접 + guardrail)"]
        INTERVIEW_SVC["context.ts"]
        CAREER_SVC["career.ts"]
        COMPANY_SVC["companyMeta.ts"]
        SKILLGAP_SVC["publicSkillGap.ts"]
    end

    subgraph Gemini["<b>Google Gemini REST</b>"]
        G1["models/{model}:generateContent"]
        G2["models/{model}:streamGenerateContent (SSE)"]
        G3["text-embedding-004:embedContent"]
        G4["imagen-3.0:predict"]
    end

    LLM_CHAT --> LLM_SVC
    LLM_STREAM --> LLM_SVC
    LLM_REFINE --> LLM_SVC
    INT_CHAT --> INTERVIEW_SVC --> LLM_SVC
    RES_REFINE --> RESUME_SVC --> LLM_SVC
    RES_CHAT --> RESUME_SVC --> LLM_SVC
    QA --> QA_SVC --> LLM_SVC
    HUMAN --> HUMAN_SVC --> LLM_SVC
    STUDIO --> IMG
    CAREER --> CAREER_SVC --> EMB
    COMPANY --> COMPANY_SVC --> LLM_SVC
    SKILLGAP --> SKILLGAP_SVC --> LLM_SVC

    LLM_SVC --> G1
    LLM_SVC --> G2
    EMB --> G3
    IMG --> G4

    classDef api fill:#3b82f6,color:#fff,stroke:#2563eb
    classDef svc fill:#059669,color:#fff,stroke:#047857
    classDef gem fill:#7c3aed,color:#fff,stroke:#6d28d9
    class LLM_CHAT,LLM_STREAM,LLM_REFINE,INT_CHAT,RES_REFINE,RES_CHAT,QA,HUMAN,STUDIO,CAREER,COMPANY,SKILLGAP api
    class LLM_SVC,EMB,IMG,QA_SVC,HUMAN_SVC,RESUME_SVC,INTERVIEW_SVC,CAREER_SVC,COMPANY_SVC,SKILLGAP_SVC svc
    class G1,G2,G3,G4 gem
```

핵심: `src/server/llm.ts`가 내보내는 `callLLMText` / `callLLMStructured`(zod → OpenAPI 스키마 → JSON 모드) / `streamLLMText`(SSE 파싱 → `ReadableStream`) 만을 모든 서비스와 라우트가 임포트합니다. `llmCache.ts`(인메모리 TTL 캐시)는 `llm/chat`, `llm/refine`, `company/meta`에 적용됩니다. 설정 해석은 DB(`systemSettings`) → env 폴백 순이며, `VERCEL_AI_GATEWAY_URL` 설정 시 Vercel AI Gateway 경유가 활성화됩니다 (기본값은 Gemini 직결).

---

## Service Layer Architecture

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor': '#059669', 'primaryBorderColor': '#047857', 'lineColor': '#94a3b8', 'secondaryColor': '#f0fdf4', 'tertiaryColor': '#dbeafe', 'clusterBkg': '#f8fafc', 'clusterBorder': '#e2e8f0'}}}%%
flowchart LR
    subgraph API["<b>API Routes (src/app/api · 48 handlers)</b>"]
        AUTH["auth/* 14"]
        RESUME["resumes/* 4"]
        INTERVIEW["interviews/* 3"]
        ATS["ats/analyze"]
        LLM["llm/* 3"]
        QA["qa/* 2"]
        HUMAN["humanizer/* 2"]
        CAREER["careers/* 3"]
        STUDIO["studio/* 4"]
        COMMUNITY["community/* 2"]
        CHAT["chat/* 2"]
        DOCS["docs/* 4"]
        FILES["files/* (uploads 서빙)"]
        COMPANY["company/meta"]
        ADMIN["admin/* 3"]
        MCP["mcp/manifest"]
    end

    subgraph Services["<b>Service Modules (src/server · 21)</b>"]
        LLM_SVC["llm.ts · llmCache.ts"]
        GUARD["guardrail.ts 4-Layer"]
        RESUME_SVC["resumes/* (라우트 직접)"]
        INTERVIEW_SVC["context.ts"]
        ATS_SVC["ats.ts skill taxonomy"]
        QA_SVC["qa.ts"]
        HUMAN_SVC["humanizer.ts"]
        CAREER_SVC["career.ts + embedding.ts"]
        COMPANY_SVC["companyMeta.ts"]
        SKILLGAP["publicSkillGap.ts"]
        PARSER["parser.ts · hwpParser.ts"]
        AUTH_SVC["auth.ts · mfa.ts · getSession.ts"]
        BLOB_SVC["blob.ts"]
        SYS_CFG["systemConfig.ts"]
        MCP_SVC["mcp.ts"]
        IMG_SVC["imageGen.ts"]
        HTTP["http.ts (공통 에러 헬퍼)"]
    end

    subgraph Middleware["<b>Middleware</b>"]
        AUTH_MW["middleware.ts<br/>JWT Session (kairos_session)"]
    end

    API --> AUTH_MW
    API --> Services
    Services --> DB[("NeonDB + pgvector")]
    Services --> AI[("Gemini API (직접 REST)")]

    classDef api fill:#3b82f6,color:#fff,stroke:#2563eb
    classDef svc fill:#059669,color:#fff,stroke:#047857
    classDef mw fill:#d97706,color:#fff,stroke:#b45309
    classDef store fill:#7c3aed,color:#fff,stroke:#6d28d9
    class AUTH,RESUME,INTERVIEW,ATS,LLM,QA,HUMAN,CAREER,STUDIO,COMMUNITY,CHAT,DOCS,FILES,COMPANY,ADMIN,MCP api
    class LLM_SVC,GUARD,RESUME_SVC,INTERVIEW_SVC,ATS_SVC,QA_SVC,HUMAN_SVC,CAREER_SVC,COMPANY_SVC,SKILLGAP,PARSER,AUTH_SVC,BLOB_SVC,SYS_CFG,MCP_SVC,IMG_SVC,HTTP svc
    class AUTH_MW mw
    class DB,AI store
```

- **페이지 인증**: `middleware.ts`가 10개 경로(`/resume`, `/interview`, `/ats`, `/humanizer`, `/qa`, `/career`, `/studio`, `/docs`, `/settings`, `/admin`)를 보호합니다.
- **API 인증**: 각 라우트가 `getSession(req)`으로 JWT를 개별 검증합니다.
- **공통 응답**: `http.ts`의 `unauthorized` / `badRequest` / `notFound` / `serviceUnavailable` / `internalError` 헬퍼로 통일합니다.

---

## Database ERD

Drizzle ORM 기반 **16개 테이블** (NeonDB PostgreSQL + pgvector). `DATABASE_URL` 미설정 시 DB 커넥션이 `null`이 되고 앱은 데모 모드로 동작합니다.

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor': '#2563eb', 'primaryBorderColor': '#1d4ed8', 'lineColor': '#94a3b8', 'secondaryColor': '#f0f9ff', 'tertiaryColor': '#fef3c7', 'clusterBkg': '#f8fafc', 'clusterBorder': '#e2e8f0', 'nodeBorder': '#475569', 'nodeTextColor': '#1e293b'}}}%%
erDiagram
    users {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar name
        varchar role "user | admin | manager"
        text avatar_url
        varchar google_id UK
        varchar wallet_address
        varchar mfa_secret
        boolean mfa_enabled
        timestamp created_at
        timestamp updated_at
    }

    resumes {
        uuid id PK
        uuid user_id FK
        varchar title
        text original_content
        text parsed_text
        varchar status "draft | evaluating | improved"
        integer current_score
        timestamp created_at
        timestamp updated_at
    }

    resume_refinements {
        uuid id PK
        uuid resume_id FK
        varchar step "draft | evaluate | improve"
        text draft_content
        jsonb evaluation_feedback
        integer score
        text improved_content
        timestamp created_at
    }

    mock_interviews {
        uuid id PK
        uuid user_id FK
        varchar job_title
        varchar company_name
        varchar difficulty "junior | medium | senior"
        varchar status "in_progress | completed"
        integer overall_score
        text overall_feedback
        timestamp created_at
        timestamp updated_at
    }

    interview_messages {
        uuid id PK
        uuid interview_id FK
        varchar sender "interviewer | candidate"
        text message
        varchar question_type
        jsonb feedback
        timestamp created_at
    }

    ats_analyses {
        uuid id PK
        uuid user_id FK
        varchar job_title
        text job_description
        uuid resume_id FK
        integer match_score
        jsonb missing_keywords
        jsonb found_keywords
        jsonb recommendations
        jsonb detailed_breakdown
        timestamp created_at
    }

    humanized_texts {
        uuid id PK
        uuid user_id FK
        text original_text
        text humanized_text
        integer style_score
        text changes_summary
        timestamp created_at
    }

    qa_sets {
        uuid id PK
        uuid user_id FK
        varchar title
        varchar target_role
        jsonb qa_pairs
        timestamp created_at
    }

    careers {
        uuid id PK
        uuid user_id FK
        varchar company
        varchar role
        varchar period
        text description
        jsonb achievements
        vector embedding "pgvector 1536d"
        timestamp created_at
        timestamp updated_at
    }

    company_meta {
        uuid id PK
        varchar company_name UK
        varchar industry
        integer wlb_score
        integer culture_score
        integer salary_score
        text pros_summary
        text cons_summary
        text ai_insight
        timestamp created_at
    }

    community_posts {
        uuid id PK
        uuid user_id FK
        varchar title
        text content
        varchar category "interview_pass | career_tip | qna"
        integer likes_count
        timestamp created_at
    }

    chat_sessions {
        uuid id PK
        uuid user_id FK "nullable"
        varchar title
        jsonb messages
        text context
        boolean is_public
        timestamp created_at
        timestamp updated_at
    }

    studio_images {
        uuid id PK
        uuid user_id FK
        varchar type "generated | uploaded"
        text prompt
        text image_url
        integer width
        integer height
        varchar original_file_name
        timestamp created_at
    }

    system_settings {
        uuid id PK
        varchar key UK
        text value
        varchar category "env | feature_flag | llm | storage"
        text description
        boolean is_encrypted
        uuid updated_by FK
        timestamp updated_at
    }

    audit_logs {
        uuid id PK
        uuid user_id FK
        varchar action
        varchar category
        jsonb details
        varchar ip_address
        timestamp created_at
    }

    push_subscriptions {
        uuid id PK
        uuid user_id FK
        text endpoint
        text p256dh
        text auth
        timestamp created_at
    }

    %% Core Domain
    users ||--o{ resumes : "소유"
    users ||--o{ mock_interviews : "응시"
    users ||--o{ ats_analyses : "분석 요청"
    users ||--o{ humanized_texts : "변환"
    users ||--o{ qa_sets : "생성"
    users ||--o{ careers : "경력 등록"
    users ||--o{ community_posts : "작성"
    users ||--o{ chat_sessions : "대화"
    users ||--o{ studio_images : "이미지"
    users ||--o{ push_subscriptions : "구독"
    users ||--o{ audit_logs : "감사 로그"

    %% Interview Domain
    mock_interviews ||--o{ interview_messages : "대화 기록"

    %% Resume Domain
    resumes ||--o{ resume_refinements : "개선 이력"
    resumes ||--o{ ats_analyses : "참조"

    %% System Domain
    system_settings ||--o| users : "수정자 (set null)"
```

모든 FK는 `onDelete: cascade` (단, `systemSettings.updatedBy`는 `set null`).

---

## AI Guardrail System (4-Layer)

| Layer | Function | Description |
|---|---|---|
| L1 | `checkInputGuardrail` | 입력 검증 · 최대 길이 제한 |
| L2 | `checkContextGuardrail` | 프롬프트 인젝션 감지 |
| L3 | `checkOutputAsyncGuardrail` | PII 감지 (주민번호) + 자동 마스킹 |
| L4 | `checkLoopGuardrail` | 무한 루프 방지 (최대 3회 반복) |

---

## HWP / HWPX 문서 지원 (@rhwp)

| 기능 | 구현 |
|---|---|
| **서버 텍스트 추출** | `src/server/hwpParser.ts` (hwplib-js) — 업로드/파싱 라우트, 추출 텍스트를 메타데이터 `textContent`로 영속화 |
| **클라이언트 추출** | `src/lib/hwpTextExtract.ts` (@rhwp/core WASM) — 뷰어/미리보기 |
| **웹 뷰어** | `src/components/HwpViewer.tsx` — @rhwp/core SVG 페이지 렌더, 페이지네이션 (`/docs/[id]`) |
| **웹 에디터** | `src/components/HwpEditor.tsx` — @rhwp/editor iframe 임베드, HWP/HWPX 저장 → 업로드 API (`/docs/edit`) |
| **WASM 바이너리** | `scripts/copy-rhwp.mjs` (postinstall) → `public/rhwp_bg.wasm` (gitignore) |

- 에디터 스튜디오 URL은 `NEXT_PUBLIC_RHWP_STUDIO_URL`로 셀프호스팅 지정 가능 (기본: 공개 데모 — 기밀 문서는 배포 시 env 설정 필수).

---

## Auth & Sessions

| 방식 | 구현 |
|---|---|
| **Email / Password** | bcryptjs 해시 · 로그인 시 `kairos_session` JWT 쿠키 발급 (jose HS256, 7일) |
| **Google OAuth2** | `/api/auth/google` → 콜백에서 코드 교환 + 사용자 upsert |
| **Web3 Wallet** | `/api/auth/nonce` 논스 발급 → viem 서명 검증 (`/api/auth/wallet`) |
| **TOTP MFA** | otplib + QR 코드 (`/api/auth/mfa/*`, UI는 향후 확장용) |
| **미들웨어** | `kairos_session` 검증, 10개 보호 경로, `JWT_SECRET` 미설정 시 개발 모드 통과 |

---

## Demo Mode (Mock)

- `DATABASE_URL` 미설정 → `db` 커넥션이 `null` → 데모 모드 (mock 데이터 폴백).
- 로그인 페이지에서 `testmockup / 12345` 계정으로 데모 로그인 가능 — `src/data/mock/mockup.ts`의 `generateProfiles()`가 localStorage에 50명 프로필을 시드합니다.
- 데모 전용 시뮬레이션: `CareerAssistantPanel` (가짜 3단계 thinking + 하드코딩 응답), `getSimulatedLLMResponse()` (키워드 분기 응답).

---

## Quick Start

```bash
# Install dependencies (legacy-peer-deps 활성화: .npmrc)
npm install

# Configure environment
cp .env.example .env
# 필수: GOOGLE_GENERATIVE_AI_API_KEY, DATABASE_URL, JWT_SECRET
# 선택: GOOGLE_CLIENT_ID/SECRET, BLOB_READ_WRITE_TOKEN, VERCEL_AI_GATEWAY_URL/KEY,
#       NEXT_PUBLIC_RHWP_STUDIO_URL

# Development server
npm run dev            # http://localhost:3000

# Production build & start
npm run build
npm run start

# Database commands
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply migrations to NeonDB
npm run db:studio    # Launch Drizzle Studio GUI

# Tests
npm test             # Vitest · 55 tests (src/server 대상)
```

### Environment Variables (`.env.example`)

| Group | Keys |
|---|---|
| **Gemini AI** | `GOOGLE_GENERATIVE_AI_API_KEY` |
| **Vercel AI Gateway** (선택) | `VERCEL_AI_GATEWAY_URL`, `VERCEL_AI_GATEWAY_KEY` |
| **NeonDB** | `DATABASE_URL`, `DATABASE_URL_UNPOOLED` |
| **Vercel Blob** | `BLOB_READ_WRITE_TOKEN` |
| **Google OAuth2** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **JWT Session** | `JWT_SECRET` (32자 이상) |
| **HWP Editor Studio** (선택) | `NEXT_PUBLIC_RHWP_STUDIO_URL` |

---

## Project Structure

```
kairos/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 루트 레이아웃 (AuthProvider → RootLayoutClient)
│   │   ├── page.tsx            # 랜딩 / 대시보드 (인증 분기)
│   │   ├── (authenticated)/    # resume, interview, ats, humanizer, qa, career, studio, docs, community, settings, admin
│   │   ├── auth/               # login, register
│   │   ├── r/[id]/             # 공유 AI 채팅 뷰어
│   │   ├── presentation/       # 경진대회 발표자료 (10슬라이드)
│   │   ├── error.tsx           # 전역 에러 바운더리
│   │   └── api/                # 45 Route Handlers
│   ├── components/             # 11개 클라이언트 컴포넌트 (Navbar, Sidebar, HwpViewer, HwpEditor, ...)
│   ├── context/                # AuthContext (JWT + 데모 모드)
│   ├── hooks/                  # useChat, useDocumentParser
│   ├── lib/                    # toast, mockInterceptor, hwpTextExtract
│   ├── server/                 # 서비스 모듈 21개 (llm, embedding, imageGen, ats, qa, humanizer, ...)
│   ├── data/                   # presentationSlides.tsx · mock/ (데모 프로필)
│   ├── utils/                  # diff.ts (단어 단위 diff HTML)
│   └── middleware.ts           # JWT 세션 가드
├── db/                         # Drizzle ORM (schema.ts 16테이블, index.ts)
├── shared/                     # 공용 타입 (User, AuthResponse)
├── packages/                   # 플랫폼 브리지 목 스텁 (tauri-bridge, mobile-bridge, agent-cli)
├── public/                     # 브랜드 SVG 7종 · rhwp_bg.wasm (postinstall 산출물)
├── scripts/                    # copy-rhwp.mjs (WASM 복사)
├── test/                       # Vitest · 서비스 테스트 9파일
├── drizzle/                    # SQL 마이그레이션
├── next.config.ts · vercel.json · drizzle.config.ts · vitest.config.ts · tsconfig.json
├── seed-design.json            # Seed Design CLI 설정 (컴포넌트 미생성)
└── .env.example                # 환경변수 템플릿
```

---

## Multi-Platform Bridges (Stubs)

`packages/` 아래 플랫폼별 브리지가 목(mock) 스텁으로 정의되어 있습니다 (tsconfig exclude).

| Package | Target | Status |
|---|---|---|
| `packages/tauri-bridge` | Tauri v2 (Desktop) · HWP 파서 FFI | Mock 스텁 |
| `packages/mobile-bridge` | React Native (Expo) · STT/TTS | Mock 스텁 |
| `packages/agent-cli` | CLI 에이전트 시뮬레이션 | Mock 스텁 |

---

## Deployment

- **Vercel**: `vercel.json` — `next build`, 서울 리전 `icn1` 단일 배포, API 캐시 방지 + 보안 헤더.
- **`next.config.ts`**: `serverExternalPackages` (drizzle-orm, @neondatabase/serverless, bcryptjs, jose), `outputFileTracingRoot` 루트 기준.
- **보안 헤더**: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`.
- **`public/rhwp_bg.wasm`** 은 postinstall 산출물로 gitignore 처리 — 클론 직후 `npm install`이 필요합니다.

---

*최종 수정: 2026-08-02 | Next.js 15 단일 프레임워크 기준 (Nuxt 4 / Nitro / Astro / Payload / PWA 제거 완료)*
