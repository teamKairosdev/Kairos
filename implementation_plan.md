# Kairos - Full-Stack AI Job-Application Preparation Platform Implementation Plan

Build a state-of-the-art, full-stack AI job-application preparation platform explicitly named **Kairos**. It features an end-to-end TypeScript architecture using **Nuxt 4**, **Drizzle ORM** with **PostgreSQL + pgvector**, **Vercel AI SDK**, **Nuxt UI**, **Nuxt Auth Utils**, and document parsing capabilities (`pdf.js` + `mammoth`).

---

## User Review Required

> [!IMPORTANT]
> **Database & LLM Credentials Requirement**
> The platform requires a PostgreSQL database instance with the `pgvector` extension enabled, alongside API keys for at least one supported provider (OpenAI, Anthropic, or Google Gemini). A graceful fallback system will be built into `server/services/llm.ts`.

> [!NOTE]
> **Architecture Overview**
> - **Framework**: Nuxt 4 with SSR and integrated Nitro server API route handlers.
> - **Max 2 Layers**: Direct `server/api` handler $\rightarrow$ `server/services` architecture without redundant abstraction layers or LangGraph state machines.
> - **Single DB Schema File**: `db/schema.ts` handles all tables, relations, and pgvector embeddings.
> - **Containerization**: Single multi-stage `Dockerfile` and `docker-compose.yml`.

---

## Proposed System Architecture & Files

### 1. Database Layer (`db/`)
- **`db/schema.ts`** [NEW]: Single schema definition including Users, Resumes, ResumeRefinements, MockInterviews, InterviewMessages, ATSAnalyses, HumanizedTexts, QASets, and Careers (with pgvector embedding vectors).
- **`db/index.ts`** [NEW]: Drizzle ORM connection client initialization with postgres pool.

### 2. Core Server Services Layer (`server/services/`)
- **`server/services/llm.ts`** [NEW]: Robust LLM caller using Vercel AI SDK (`ai`) with multi-provider fallback strategy (OpenAI $\rightarrow$ Anthropic $\rightarrow$ Google).
- **`server/services/embedding.ts`** [NEW]: Vector embedding generator using Vercel AI SDK embedding models.
- **`server/services/resume.ts`** [NEW]: Async pipeline for Draft $\rightarrow$ Evaluate $\rightarrow$ Improve chain.
- **`server/services/interview.ts`** [NEW]: SSE streaming interview manager and question generator.
- **`server/services/ats.ts`** [NEW]: ATS match analyzer, score evaluator, and keyword extractor.
- **`server/services/humanizer.ts`** [NEW]: Natural language rewriting service to eliminate AI writing style traces.
- **`server/services/qa.ts`** [NEW]: Interview Q&A generator based on resume and job postings.
- **`server/services/career.ts`** [NEW]: Career history manager & pgvector semantic search querying.
- **`server/services/parser.ts`** [NEW]: Extract raw text content from uploaded PDF and DOCX files (`pdfjs-dist`, `mammoth`).

### 3. Server API Routes (`server/api/` & `server/middleware/`)
- **`server/middleware/auth.ts`** [NEW]: JWT and Nuxt Auth Utils session protection middleware.
- **`server/api/auth/register.post.ts`** [NEW]: User registration.
- **`server/api/auth/login.post.ts`** [NEW]: User authentication and JWT issuance.
- **`server/api/auth/me.get.ts`** [NEW]: Authenticated user session retrieve.
- **`server/api/resumes/index.get.ts`** & **`index.post.ts`** [NEW]: List and create resumes.
- **`server/api/resumes/[id].get.ts`** [NEW]: Get single resume with refinement history.
- **`server/api/resumes/[id]/refine.post.ts`** [NEW]: Trigger draft $\rightarrow$ evaluate $\rightarrow$ improve refinement pipeline.
- **`server/api/resumes/parse.post.ts`** [NEW]: Parse file uploads (PDF/DOCX).
- **`server/api/interviews/index.get.ts`** & **`index.post.ts`** [NEW]: Create and fetch mock interview sessions.
- **`server/api/interviews/[id]/chat.post.ts`** [NEW]: SSE streaming mock interview response endpoint.
- **`server/api/ats/analyze.post.ts`** [NEW]: Execute ATS match evaluation against job descriptions.
- **`server/api/humanizer/process.post.ts`** [NEW]: Execute AI tone humanization on input text.
- **`server/api/qa/generate.post.ts`** [NEW]: Generate targeted Q&A sets.
- **`server/api/careers/index.get.ts`** & **`index.post.ts`** [NEW]: Career experience CRUD.
- **`server/api/careers/search.get.ts`** [NEW]: pgvector semantic search endpoint across career items and resumes.

### 4. Client Application (`app/`)
- **`app/assets/css/main.css`** [NEW]: Design system tokens, Glassmorphism utilities, dark mode palette (Deep Space Violet, Celestial Gold, Cyber Amber).
- **`app/app.vue`** [NEW]: Layout frame, meta titles, notification toasts.
- **`app/components/Navbar.vue`** [NEW]: Header navigation bar with user status and mode toggles.
- **`app/components/Sidebar.vue`** [NEW]: Responsive dashboard navigation panel.
- **`app/components/StatCard.vue`** [NEW]: Visual analytical counters and stat widgets.
- **`app/pages/index.vue`** [NEW]: Kairos Dashboard overview & quick actions landing.
- **`app/pages/auth/login.vue`** & **`register.vue`** [NEW]: Premium glassmorphic auth interfaces.
- **`app/pages/resume/index.vue`** & **`[id].vue`** [NEW]: Interactive resume editor and 3-step refinement workflow visualization.
- **`app/pages/interview/index.vue`** & **`[id].vue`** [NEW]: Real-time SSE streaming mock interview chamber with chat UI.
- **`app/pages/ats/index.vue`** [NEW]: ATS match radar, score breakdown, missing keywords analyzer.
- **`app/pages/humanizer/index.vue`** [NEW]: Side-by-side AI text humanizer with style metrics.
- **`app/pages/qa/index.vue`** [NEW]: Customizable Q&A flashcards and expected answer generators.
- **`app/pages/career/index.vue`** [NEW]: Career portfolio manager with pgvector Semantic Search interface.

### 5. Config & Infrastructure
- **`package.json`** [NEW/MODIFY]: Explicitly named `"name": "kairos"` with full dependency tree.
- **`nuxt.config.ts`** [NEW]: Nuxt 4 SSR config, modules (`@nuxt/ui`, `@vueuse/nuxt`), nitro config.
- **`drizzle.config.ts`** [NEW]: Drizzle ORM configuration for PostgreSQL pgvector schema.
- **`Dockerfile`** [NEW]: Multi-stage container build for single Docker deployment.
- **`docker-compose.yml`** [NEW]: PostgreSQL with pgvector extension setup + Kairos container stack.
- **`.env.example`** [NEW]: Environment variables template.
- **`README.md`** [MODIFY]: Complete installation, architecture, and deployment guide for Kairos.

---

## Verification Plan

### Automated & Build Verification
1. `npm run build` or `npx nuxi build`: Verify TypeScript compilation and Nuxt SSR bundle creation without error.
2. `npx drizzle-kit generate` / schema syntax check: Ensure Drizzle schema validation passes cleanly.

### Functional Verification
1. **Auth Workflow**: Verify registration, login, JWT token issuance, and protected API routes.
2. **Resume Refinement Chain**: Test draft creation, LLM evaluation scoring, and refined output generation.
3. **SSE Streaming Interview**: Test interview session creation and stream chunk delivery via SSE.
4. **ATS & Humanizer**: Test real LLM execution for matching score and natural language humanization.
5. **pgvector Semantic Search**: Verify semantic vector query matching over career/resume items.
