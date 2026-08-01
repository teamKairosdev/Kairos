# Kairos: AI-Driven Career Operating System

> **"당신의 커리어 전 생애를 기억하고, 분석하고, 대신 행동하는 AI"**

Kairos는 **Next.js 15 (App Router)** 단일 프레임워크 아키텍처로 구축된 AI 기반 커리어 관리 플랫폼입니다. **Google Gemini API**(직접 REST 구현, AI SDK 미사용), **NeonDB (pgvector)**, **Vercel AI Gateway**를 활용하여 이력서 분석/개선, AI 모의면접, ATS 호환성 검사, 문장 휴머나이저, 커리어 시맨틱 검색 등을 제공합니다.

---

## System Architecture

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor': '#2563eb', 'primaryTextColor': '#fff', 'primaryBorderColor': '#1d4ed8', 'lineColor': '#94a3b8', 'secondaryColor': '#f0f9ff', 'tertiaryColor': '#f8fafc', 'clusterBkg': '#f1f5f9', 'clusterBorder': '#cbd5e1', 'nodeBorder': '#475569', 'nodeTextColor': '#1e293b'}}}%%
flowchart TB
    subgraph Client["<b>Client Layer</b>"]
        direction TB
        NEXT["<b>Next.js 15 App</b><br/>React 19 · RSC + Client Components<br/>Resume · Interview · ATS · Career"]
        PWA["<b>PWA</b><br/>Service Worker · IndexedDB<br/>Offline Queue · Local Vector Search"]
    end

    subgraph Edge["<b>Edge / API Layer</b>"]
        direction TB
        API["<b>Next.js Route Handlers</b><br/>~45 API Routes · JWT Auth · RateLimit"]
        PAYLOAD["<b>Payload CMS</b><br/>Next.js 15 · Admin UI<br/>Users · Settings · Audit"]
    end

    subgraph AI["<b>AI / LLM Layer</b>"]
        direction TB
        GEMINI["<b>Google Gemini</b><br/>2.0 Flash · Embedding 004<br/>Imagen 3.0"]
        GATEWAY["<b>Vercel AI Gateway</b><br/>Caching · Observability<br/>(optional)"]
    end

    subgraph Storage["<b>Storage Layer</b>"]
        NEON[("<b>NeonDB</b><br/>PostgreSQL + pgvector<br/>1536d embeddings")]
        BLOB[("<b>Vercel Blob</b><br/>File Storage")]
        LOCAL[("<b>Local FS</b><br/>uploads/")]
    end

    NEXT <--> API
    API -->|"JWT · Cookie"| PAYLOAD
    API --> GEMINI
    API --> GATEWAY
    GATEWAY --> GEMINI
    API --> NEON
    API --> BLOB
    API --> LOCAL
    NEXT -->|"text/plain stream"| API

    classDef primary fill:#2563eb,color:#fff,stroke:#1d4ed8
    classDef secondary fill:#f0f9ff,stroke:#93c5fd,color:#1e40af
    classDef accent fill:#fef3c7,stroke:#f59e0b,color:#92400e
    classDef storage fill:#f0fdf4,stroke:#86efac,color:#166534
    class NEXT,PWA primary
    class API,PAYLOAD secondary
    class GEMINI,GATEWAY accent
    class NEON,BLOB,LOCAL storage
```

---

## Tech Stack

| Category | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) · React 19 |
| **Language** | TypeScript (strict) |
| **AI / LLM** | Google Gemini 2.0 Flash · **직접 REST 구현** (`src/server/llm.ts`) |
| **Database** | NeonDB (PostgreSQL) · Drizzle ORM · pgvector (1536d) |
| **Auth** | JWT (jose) · Google OAuth2 · Web3 Wallet (viem) · TOTP MFA (otplib) |
| **Storage** | Vercel Blob · Local filesystem (HWP/DOCX/PDF) |
| **CMS** | Payload CMS + Next.js 15 + Lexical Editor |
| **Styling** | Seed Design · Tailwind CSS v4 |
| **PWA** | Service Worker · IndexedDB (idb) |
| **Client AI** | vectra (IndexedDB 로컬 벡터 검색) |
| **Testing** | Vitest |
| **Deploy** | Vercel (Seoul region) |
| **Multi-platform** | Tauri v2 (Desktop) · React Native Expo (Mobile) · Chrome/VSCode Extensions |

---

## Database ERD

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
        uuid user_id FK
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

    %% Core Domain (User Profile)
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

    %% Interview Domain
    mock_interviews ||--o{ interview_messages : "대화 기록"

    %% Resume Domain
    resumes ||--o{ resume_refinements : "개선 이력"
    resumes ||--o{ ats_analyses : "참조"

    %% System Domain
    users ||--o{ audit_logs : "감사 로그"
    system_settings ||--o| users : "수정자"

    %% Company Domain
    careers ||--o{ company_meta : "참조"
```

---

## LLM Architecture (직접 REST 구현)

AI SDK(`ai`, `@ai-sdk/*`)를 사용하지 않고, **Google Gemini REST API를 직접 호출**하는 공용 모듈이 모든 LLM 기능의 유일한 진입점입니다.

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor': '#059669', 'primaryBorderColor': '#047857', 'lineColor': '#94a3b8', 'secondaryColor': '#f0fdf4', 'tertiaryColor': '#dbeafe', 'clusterBkg': '#f8fafc', 'clusterBorder': '#e2e8f0'}}}%%
flowchart LR
    subgraph API["<b>Route Handlers (src/app/api)</b>"]
        LLM_CHAT["llm/chat"]
        LLM_STREAM["llm/stream"]
        LLM_REFINE["llm/refine"]
        INT_CHAT["interviews/[id]/chat"]
        RES_REFINE["resumes/[id]/refine"]
        RES_CHAT["resumes/[id]/chat"]
        QA["qa/generate"]
        HUMAN["humanizer/process"]
        STUDIO["studio/generate"]
        CAREER["careers/search"]
        COMPANY["company/meta"]
        SKILLGAP["public/skill-gap"]
    end

    subgraph Services["<b>Service Modules (src/server)</b>"]
        LLM_SVC["llm.ts<br/>callLLMText · callLLMStructured · streamLLMText"]
        EMB["embedding.ts<br/>generateEmbedding"]
        IMG["imageGen.ts<br/>generateStudioImage"]
        QA_SVC["qa.ts"]
        HUMAN_SVC["humanizer.ts"]
        RESUME_SVC["resume.ts · guardrail.ts"]
        INTERVIEW_SVC["interview.ts · context.ts"]
        CAREER_SVC["career.ts"]
        COMPANY_SVC["companyMeta.ts"]
        SKILLGAP_SVC["publicSkillGap.ts"]
    end

    subgraph Gemini["<b>Google Gemini REST</b>"]
        G1["generateContent"]
        G2["streamGenerateContent (SSE)"]
        G3["embedContent"]
        G4["imagen predict"]
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

핵심: `src/server/llm.ts`가 내보내는 `callLLMText` / `callLLMStructured`(zod → OpenAPI 스키마 → JSON 모드) / `streamLLMText`(SSE 파싱 → `ReadableStream`) 만을 모든 서비스와 라우트가 임포트합니다.

---

## Service Layer Architecture

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor': '#059669', 'primaryBorderColor': '#047857', 'lineColor': '#94a3b8', 'secondaryColor': '#f0fdf4', 'tertiaryColor': '#dbeafe', 'clusterBkg': '#f8fafc', 'clusterBorder': '#e2e8f0'}}}%%
flowchart LR
    subgraph API["<b>API Routes (src/app/api ~45 handlers)</b>"]
        AUTH["auth/*"]
        RESUME["resumes/*"]
        INTERVIEW["interviews/*"]
        ATS["ats/*"]
        LLM["llm/*"]
        QA["qa/*"]
        HUMAN["humanizer/*"]
        CAREER["careers/*"]
        STUDIO["studio/*"]
        COMMUNITY["community/*"]
        CHAT["chat/*"]
        DOCS["docs/*"]
        COMPANY["company/*"]
        ADMIN["admin/*"]
        MCP["mcp/*"]
    end

    subgraph Services["<b>Service Modules (src/server 20+)</b>"]
        LLM_SVC["llm.ts · llmCache.ts"]
        GUARD["guardrail.ts 4-layer"]
        RESUME_SVC["resume.ts"]
        INTERVIEW_SVC["interview.ts · context.ts"]
        ATS_SVC["ats.ts skill taxonomy"]
        QA_SVC["qa.ts"]
        HUMAN_SVC["humanizer.ts"]
        CAREER_SVC["career.ts + embedding.ts"]
        COMPANY_SVC["companyMeta.ts"]
        SKILLGAP["publicSkillGap.ts"]
        PARSER["parser.ts · hwpParser.ts"]
        AUTH_SVC["auth.ts · mfa.ts"]
        BLOB_SVC["blob.ts"]
        SYS_CFG["systemConfig.ts"]
        MCP_SVC["mcp.ts"]
        IMG_SVC["imageGen.ts"]
    end

    subgraph Middleware["<b>Middleware</b>"]
        AUTH_MW["middleware.ts JWT Session"]
        RATE["lib/rateLimit.ts IP-based"]
    end

    API --> AUTH_MW
    AUTH_MW --> RATE
    RATE --> Services
    Services --> DB[("NeonDB + pgvector")]
    Services --> AI[("Gemini API (직접 REST)")]

    classDef api fill:#3b82f6,color:#fff,stroke:#2563eb
    classDef svc fill:#059669,color:#fff,stroke:#047857
    classDef mw fill:#d97706,color:#fff,stroke:#b45309
    classDef store fill:#7c3aed,color:#fff,stroke:#6d28d9
    class AUTH,RESUME,INTERVIEW,ATS,LLM,QA,HUMAN,CAREER,STUDIO,COMMUNITY,CHAT,DOCS,COMPANY,ADMIN,MCP api
    class LLM_SVC,GUARD,RESUME_SVC,INTERVIEW_SVC,ATS_SVC,QA_SVC,HUMAN_SVC,CAREER_SVC,COMPANY_SVC,SKILLGAP,PARSER,AUTH_SVC,BLOB_SVC,SYS_CFG,MCP_SVC,IMG_SVC svc
    class AUTH_MW,RATE mw
    class DB,AI store
```

---

## Multi-Platform Shell Strategy

| Shell | Technology | Features |
|---|---|---|
| **Web** | Next.js 15 App Router | PWA · Offline IndexedDB · Text Stream |
| **Mobile** | React Native (Expo) | STT/TTS Voice Interview · Secure Store |
| **Desktop** | Tauri v2 (Rust + Webview) | <10MB binary · Native HWP editing |
| **Extension** | Chrome MV3 + VS Code | DOM Parser · Git commit summary |

플랫폼별 브리지는 `packages/` (`tauri-bridge`, `mobile-bridge`, `agent-cli`)에 정의되어 있습니다.

---

## Features

| Feature | Description | Key Technology |
|---|---|---|
| **Resume Studio** | 3-stage pipeline: Draft → LLM Evaluate → STAR Improve | `resume.ts` · Gemini 2.0 Flash |
| **AI Mock Interview** | Real-time text streaming with context window + live feedback | `hooks/useChat.ts` · `interview.ts` |
| **ATS Analyzer** | Keyword matching (80+ skills, 7 categories) | `ats.ts` · Pure algorithm |
| **Text Humanizer** | AI→Human tone conversion with style scoring | `humanizer.ts` · LLM Structured |
| **Q&A Generator** | Role-specific interview Q&A generation | `qa.ts` · LLM Structured |
| **Semantic Career Search** | pgvector 1536-dim cosine similarity | `embedding.ts` · `career.ts` |
| **Company Intelligence** | WLB/Culture/Salary analysis per company | `companyMeta.ts` · LLM |
| **AI Photo Studio** | Google Imagen 3.0 image generation | `imageGen.ts` · `studio/*` |
| **Community SNS** | Interview pass / Career tips / Q&A | `community/*` · Public posts |
| **Local Vector Search** | IndexedDB-기반 로컬 임베딩 검색 | vectra · Transformers |
| **MCP Hub** | Model Context Protocol tools for AI agents | `mcp.ts` · JSON Schema tools |
| **Shareable Chats** | Persistent chat sessions via `/r/:id` | `chat/*` |

---

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Fill in: DATABASE_URL, GOOGLE_GENERATIVE_AI_API_KEY, JWT_SECRET, etc.

# Development server
npm run dev            # http://localhost:3000

# Production build & start
npm run build
npm run start

# Database commands
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply migrations to NeonDB
npm run db:studio    # Launch Drizzle Studio GUI
```

---

## Project Structure

```
kairos/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # 랜딩 / 대시보드
│   │   ├── presentation/       # AI 서비스톤 발표자료 (10슬라이드)
│   │   ├── (authenticated)/    # resume, interview, ats, humanizer, qa, career, studio, docs, settings, admin
│   │   ├── auth/               # login, register
│   │   ├── r/[id]/             # 공유 AI 채팅
│   │   └── api/                # ~45 Route Handlers
│   ├── components/             # Navbar, Sidebar, RootLayoutClient, ...
│   ├── context/                # AuthContext (JWT + mock 모드)
│   ├── hooks/                  # useAuth, useChat, useDocumentParser, useOfflineQueue, ...
│   ├── lib/                    # toast, rateLimit, mockInterceptor
│   ├── server/                 # Service modules (llm, embedding, imageGen, resume, interview, ...)
│   └── data/mock/              # 데모 모드용 mock DB
├── db/                         # Drizzle ORM (schema.ts 16개 테이블, index.ts)
├── shared/                     # 공용 타입
├── seed-design/                # Seed Design React 컴포넌트
├── public/                     # PWA 아이콘, SVG, 브랜드 에셋
├── test/                       # Vitest (src/server 대상)
├── drizzle/                    # SQL 마이그레이션
├── docs/                       # 한국어 문서 (대회 기획, 심사기준)
├── contracts/                  # Solidity 스마트 컨트랙트
├── payload.config.ts           # Payload CMS 설정
├── drizzle.config.ts           # Drizzle ORM 설정
├── next.config.ts              # Next.js 설정
├── vercel.json                 # Vercel 배포 (Seoul region, next build)
├── vitest.config.ts            # 테스트 설정
├── tsconfig.json               # TypeScript strict mode
└── .env.example                # 환경변수 템플릿
```

---

## AI Guardrail System (4-Layer)

| Layer | Function | Description |
|---|---|---|
| L1 | `checkInputGuardrail` | Input validation, max length (4K chars) |
| L2 | `checkContextGuardrail` | Prompt injection detection |
| L3 | `checkOutputAsyncGuardrail` | PII detection (Korean RRN) + auto-sanitization |
| L4 | `checkLoopGuardrail` | Infinite loop prevention (max 3 iterations) |

---

*최종 수정: 2026-08-01 | Next.js 15 단일 프레임워크 기준 (Nuxt 4 / Nitro / Astro 제거 완료)*
