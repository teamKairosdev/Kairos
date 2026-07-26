# Kairos | AI Job-Application Preparation Platform

> **Kairos (카이로스)** - *"당신의 시간에 의미를 부여하는 단 하나의 청지기(Dispensator)"*

Kairos는 **TypeScript-only**, **Nuxt 4 (SSR+API)**, **Drizzle ORM**, **PostgreSQL + pgvector**, 그리고 **Vercel AI SDK**를 기반으로 구축된 최첨단 AI 취업 준비 플랫폼입니다.

---

## 🌟 Key Features (주요 기능)

1. **Auth & Session Management**: Nuxt Auth Utils 및 JWT 기반의 보안 인증 파이프라인.
2. **Resume Refinement Chain (비동기 이력서 고도화)**: `Draft` 생성 $\rightarrow$ `Evaluate` (객관적 LLM 평가) $\rightarrow$ `Improve` (STAR 기법 기반 고도화 재작성) 비동기 체인.
3. **AI Mock Interview via SSE Streaming**: 실시간 Server-Sent Events 스트리밍 기술로 끊김 없는 일대일 꼬리질문 모의면접 및 세부 답변 피드백 제공.
4. **ATS Analysis Engine**: 채용공고(JD) 대비 키워드 매칭률, 기술/경력 세부 점수 및 ATS 합격률 측정.
5. **AI Humanizer**: 정형화되거나 진부한 AI 작성 문체를 감쪽같이 자연스러운 전문 인간 작성 어조로 변환.
6. **Tailored Q&A Generation**: 지원 직무 및 경력 맞춤형 예상 질문과 최고 수준 모범 답안 플래시카드 생성.
7. **Career Management & pgvector Semantic Search**: 1536 차원 고성능 벡터 임베딩 기반의 시맨틱 유사도 검색 탐색.
8. **Document Parsing Engine**: `pdf.js` 및 `mammoth` 라이브러리로 PDF/DOCX 이력서 파일 텍스트 자동 파싱.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Nuxt 4 (Compatibility v4, SSR + Integrated Nitro API Routes)
- **Runtime & Language**: Node.js 22 / Bun (End-to-End TypeScript)
- **Database & ORM**: PostgreSQL with `pgvector` extension, Drizzle ORM (`db/schema.ts` single file)
- **AI Engine**: Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` multi-provider fallback)
- **UI & Styling**: Nuxt UI, Tailwind CSS, Custom Glassmorphism Dark Mode Design System
- **Deployment**: Single Docker Container Multi-stage build (`Dockerfile`, `docker-compose.yml`)

---

## 🚀 Quick Start & Installation

### 1. Repository Clone & Dependencies Installation
```bash
npm install
```

### 2. Environment Variables Setup (`.env`)
```bash
cp .env.example .env
# Edit .env and supply your OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY
```

### 3. Database & Local Development
```bash
# Generate DB migrations with Drizzle Kit
npm run db:generate

# Start Nuxt 4 dev server
npm run dev
```

### 4. Docker Single Container Deployment
```bash
docker-compose up --build -d
```

---

## 📂 Project Structure

```text
Kairos-1/
├── app/
│   ├── assets/css/main.css      # Glassmorphism Design Tokens & Dark Theme
│   ├── app.vue                  # Global Layout Frame & Page Entrypoint
│   ├── components/              # Navbar, Sidebar, StatCard UI Components
│   └── pages/                   # Index Dashboard, Auth, Resume, Interview, ATS, Humanizer, QA, Career
├── db/
│   ├── schema.ts                # Single Schema File (Users, Resumes, MockInterviews, ATS, Careers, pgvector)
│   └── index.ts                 # Drizzle ORM PostgreSQL Client Connection
├── server/
│   ├── api/                     # H3 Nitro API Route Handlers (Auth, Resumes, Interviews, ATS, Humanizer, Careers)
│   ├── middleware/              # Auth JWT Session Verification Middleware
│   └── services/                # Business Logic Services (LLM Fallback, Embeddings, Document Parser, Domain Engines)
├── Dockerfile                   # Multi-stage Single Container Build
├── docker-compose.yml           # PostgreSQL + pgvector & Kairos App Stack
├── nuxt.config.ts               # Nuxt 4 Configuration
├── package.json                 # Project Definition (explicitly named 'kairos')
└── README.md                    # Project Documentation
```
