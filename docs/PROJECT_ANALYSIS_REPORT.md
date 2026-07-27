# Kairos Project Analysis Report

> **Report Date**: 2026-07-28
> **Analyzer**: opencode (big-pickle model)
> **Build Tool**: Google Antigravity IDE
> **Original Build Period**: ~Late 2024 / Early 2025

---

## 1. Executive Summary (총괄 요약)

Kairos는 TypeScript 풀스택 AI 취업 준비 플랫폼으로, Antigravity IDE에서 Gemini 기반 에이전트를 통해 구축되었다. **프로젝트가 2024년 말~2025년 초에 빌드되었으나, 현재(2026년 7월) 기준으로 핵심 의존성들이 심각하게 구식이다.** 특히 Nuxt 3는 2026년 7월 31일 EOL 예정이며, Vercel AI SDK는 v4에서 v7로 3개 메이저 버전이 뒤처져 있고, Nuxt UI는 v2에서 v4로 2개 메이저 버전이 뒤처져 있다. LLM 모델들도 모두 최신 세대로 교체가 필요하다.

### Severity Rating: HIGH

모든 핵심 프레임워크와 런타임에서 significant breaking changes가 누적되었다. 장기적 유지보수를 위해 전면 업그레이드가 권장된다.

---

## 2. Antigravity IDE Analysis (안티그래비티 IDE 분석)

### 2.1 What is Antigravity IDE?

Google Antigravity는 **2025년 11월 18일**, Gemini 3 출시와 함께 공개된 **에이전트 퍼스트(Agent-First) 통합 개발 환경**이다. Google이 Windsurf 팀을 $2.4B에 인수한 후 4개월 만에 출시한 제품으로, 기존 IDE paradigm을 완전히 뒤집는 approach를 취한다.

### 2.2 Core Architecture

| Feature | Detail |
|---|---|
| **Base** | Visual Studio Code의 heavily modified fork |
| **Dual-View** | Editor View (기존 IDE 경험) + Manager View (병렬 에이전트 오케스트레이션) |
| **Multi-Agent** | 최대 5개의 에이전트를 동시에 병렬 실행 |
| **Max Context** | 2M tokens (타 IDE 대비 10배) |
| **Built-in Browser** | 에이전트가 직접 UI를 시각적으로 검증 |
| **Artifacts System** | 작업 계획, 구현 노트, 브라우저 녹화 등 투명한 산출물 |
| **AI Models** | Gemini 3.5 Flash, Gemini 3.1 Pro, Claude Sonnet/Opus 4.6, gpt-oss-120b |
| **Pricing** | Individual: $0/mo (무료), Pro: $20/mo, Ultra: $249.99/mo |
| **SWE-bench** | 76.2% |

### 2.3 Antigravity 2.0 (May 2026)

2026년 5월 출시된 2.0 버전은 단순한 IDE를 넘어 **멀티 서피스 에이전트 플랫폼**으로 확장되었다:

- **Antigravity 2.0 App**: 오케스트레이션 서피스
- **Antigravity CLI**: 터미널 기반 에이전트
- **Antigravity SDK**: Python용 프로그래밍 가능한 에이전트 (`pip install google-antigravity`)
- **Antigravity IDE**: 에디터 중심 워크플로우

### 2.4 Project Build Context

Kairos 프로젝트는 `_AGENTS_BRAIN_/sessions/s1/s1chatinitprojectbegin.md`에 기록된 660줄짜리 빌드 세션 로그를 통해 볼 수 있듯이, Antigravity IDE의 에이전트가 단계별로 구현한 결과물이다. 이 세션에서 에이전트는:

1. 사용자 요구사항 스펙을 수용
2. 모든 파일을 단계별로 구현
3. npm install/build, git commit 수행
4. 데모 데이터 및 AI 서비스 톤 적용 문서 작성

---

## 3. Current Tech Stack (현재 기술 스택)

### 3.1 Complete Dependency Map

| Category | Package | Installed Version | Latest Stable | Latest (incl. RC/Beta) | Gap Severity |
|---|---|---|---|---|---|
| **Framework** | `nuxt` | ^3.15.0 | 3.21.10 (EOL 7/31) | **4.5.1** | CRITICAL |
| **Framework** | `vue` | ^3.5.13 | 3.5.x (stable) | 3.5.x | OK |
| **Framework** | `vue-router` | ^4.5.0 | 4.5.x | **5.x** (Nuxt 4 bundled) | MEDIUM |
| **UI** | `@nuxt/ui` | ^2.19.2 | 2.19.2 | **4.10.0** | CRITICAL |
| **AI SDK** | `ai` | ^4.0.22 | 4.0.22 | **7.0.32** | CRITICAL |
| **AI SDK** | `@ai-sdk/openai` | ^1.0.11 | 1.0.11 | **4.0.0** | CRITICAL |
| **AI SDK** | `@ai-sdk/anthropic` | ^1.0.6 | 1.0.6 | **Much newer** | HIGH |
| **AI SDK** | `@ai-sdk/google` | ^1.0.12 | 1.0.12 | **Much newer** | HIGH |
| **ORM** | `drizzle-orm` | ^0.38.3 | **0.45.2** (security fix) | 1.0.0-rc.4 | HIGH |
| **ORM** | `drizzle-kit` | ^0.30.1 | **0.31.10** | 0.31.10 | MEDIUM |
| **Auth** | `jsonwebtoken` | ^9.0.2 | 9.0.2 | 9.0.2 | OK |
| **Auth** | `bcryptjs` | ^2.4.3 | 2.4.3 | 2.4.3 | OK |
| **Auth** | `nuxt-auth-utils` | ^0.5.8 | 0.5.8 | N/A | UNUSED |
| **DB** | `pg` | ^8.13.1 | 8.13.1+ | 8.x | OK |
| **Parse** | `pdfjs-dist` | ^4.10.38 | 4.10.38+ | 4.x | OK |
| **Parse** | `mammoth` | ^1.8.0 | 1.8.0 | 1.8.0 | OK |
| **Runtime** | `typescript` | ^5.7.2 | 5.7.x | **5.8+** | LOW |
| **Runtime** | Node.js | 22 (Alpine) | 22.x LTS | 22.x | OK |

### 3.2 AI Model Versions (LLM Knowledge Cutoff Problem)

| Provider | Used Model | Latest Model | Issue |
|---|---|---|---|
| **OpenAI** | `gpt-4o-mini` | gpt-4.1-mini, o4-mini | 2+ generations behind |
| **Anthropic** | `claude-3-5-haiku-20241022` | Claude Sonnet 4.6, Opus 4.6 | Outdated; Haiku 3.5 available |
| **Google** | `gemini-1.5-flash` | Gemini 3.5 Flash, 3.1 Pro | 2+ generations behind |
| **Embedding** | `text-embedding-3-small` | text-embedding-3-small | Still current |

**This is the "구식 모델" problem the user identified.** The models used have knowledge cutoffs from mid-2024 at best, meaning they cannot reason about events, APIs, or technologies released after that date.

---

## 4. Gap Analysis: What Changed Since Build

### 4.1 Nuxt 3 -> Nuxt 4 (CRITICAL)

**Nuxt 3 reaches End-of-Life on July 31, 2026** - less than 3 days from this analysis.

Key changes in Nuxt 4 (first released July 2025, now at 4.5.1):

- **New `app/` directory structure**: Application code moves under `app/`, separating from config files
- **Vite 8 + Rspack 2**: Major build toolchain upgrade
- **Vue Router v5**: Integrated upgrade
- **Unhead v3**: Head management overhaul
- **Singleton data fetching**: New layer for `useFetch`/`useAsyncData`
- **Shallow reactivity by default**: Performance improvement
- **Split TypeScript contexts**: Separate TS configs for app/server/shared/node
- **`createUseFetch`/`createUseAsyncData`**: Custom instance factories
- **SSR streaming** (experimental in 4.5)
- **Nuxt 5 preparation groundwork** already in 4.5

The project's `nuxt.config.ts` already uses `compatibilityVersion: 4`, which means it's partially Nuxt 4-ready, but the actual `nuxt` package is pinned to 3.15.x.

### 4.2 Vercel AI SDK v4 -> v7 (CRITICAL)

The Vercel AI SDK has gone through **three major versions** since the project was built:

- **v5**: SSE stream protocol replacement (was proprietary), `message.parts` replaces `message.content`, `stopWhen` replaces `maxSteps`
- **v6**: `ToolLoopAgent`, human-in-the-loop tool approval, Server Actions as primary streaming surface, DevTools for debugging
- **v7**: Latest (7.0.32), continued agent framework improvements

Migration path: `npx @ai-sdk/codemod upgrade v6` exists but v4->v5 is the painful jump. Since the project is at v4, a multi-step migration is required.

### 4.3 Nuxt UI v2 -> v4 (CRITICAL)

Nuxt UI v3 was a **complete ground-up rewrite**:

- **Tailwind CSS v4**: CSS-based configuration instead of JavaScript
- **Reka UI**: Replaced Headless UI as underlying component library
- **Tailwind Variants**: New styling API
- **7 color aliases** design system
- **55+ primitive components**

Then v4 was released with further changes. The project's glassmorphism design in `main.css` would need significant rework.

### 4.4 Drizzle ORM 0.38 -> 0.45.2 / v1.0.0-rc.4 (HIGH)

- **Security fix in 0.45.2**: Critical SQL injection vulnerability in `sql.identifier()` and `sql.as()` (CVE-worthy)
- **v1.0.0-rc.4** introduces: JIT mappers, new codec system, Effect v4 support, RQBv2 (RQBv1 removed)
- Breaking changes in RC versions: Split SQLite into async/effect variants, removed legacy casing API

### 4.5 LangGraph (NOT USED - By Design)

The project explicitly excludes LangGraph state machines (stated in `implementation_plan.md` and `nuxt.config.ts`). This was a deliberate architectural choice. The current LangGraph is at v1.2.9 (stable) with significant evolution including:
- Durable error-handler resume
- Subgraph improvements
- A2A (Agent-to-Agent) and MCP support
- Delta channel checkpointing

However, since the project doesn't use LangGraph, this is informational only. The sequential LLM call pattern used (`callLLMText` -> single function = single LLM call) remains valid but could benefit from agent patterns in AI SDK v6+.

---

## 5. Security Concerns (보안 이슈)

### 5.1 CRITICAL: Drizzle ORM SQL Injection

`drizzle-orm` 0.38.3 is **before** the critical security fix in 0.45.2 (March 2026). The `sql.identifier()` and `sql.as()` functions have improper escaping that could enable SQL injection attacks.

### 5.2 HIGH: Hardcoded Secrets in docker-compose.yml

```yaml
NUXT_SESSION_PASSWORD: kairos-session-super-secret-key-32-chars-minimum
JWT_SECRET: kairos-jwt-secret-key-2026-hyper-secure
```

These are committed to the repository in plaintext. Should use Docker secrets or external secret management.

### 5.3 MEDIUM: JWT Secret in nuxt.config.ts Fallback

```typescript
jwtSecret: process.env.JWT_SECRET || 'kairos-super-secret-jwt-key-2026',
```

The fallback value is committed to source code.

### 5.4 LOW: Deprecated Docker Compose Version Key

`version: '3.8'` is deprecated and emits warnings. Modern Docker Compose ignores this key.

---

## 6. Code Quality Issues (코드 품질 이슈)

### 6.1 Missing Explicit Dependency: `zod`

`zod` is imported in 5 service files (`resume.ts`, `interview.ts`, `ats.ts`, `humanizer.ts`, `qa.ts`) but NOT listed in `package.json`. It works only because `zod` is a transitive dependency of the `ai` package. This is fragile.

### 6.2 Unused Dependencies

| Package | Status |
|---|---|
| `lucide-vue-next` | Declared but no Lucide icons used in templates (all emoji) |
| `clsx` | Declared but never imported |
| `tailwind-merge` | Declared but never imported |
| `nuxt-auth-utils` | Registered as module but auth is manually implemented with `jsonwebtoken` |

### 6.3 AI Model Identification in Production Code

Hardcoded model identifiers in `server/services/llm.ts`:

```typescript
return openai('gpt-4o-mini');          // Line 31, 48
return anthropic('claude-3-5-haiku-20241022');  // Line 37
return google('gemini-1.5-flash');     // Line 43
```

These are the specific model IDs that need updating.

### 6.4 Missing `docs/` Directory

The project had `implementation_plan.md` at root level. It has been moved to `docs/implementation_plan.md` as part of this analysis.

---

## 7. Architecture Assessment (아키텍처 평가)

### 7.1 Strengths (장점)

- **Clean 2-layer server architecture**: `server/api` (routes) -> `server/services` (business logic). Simple and maintainable.
- **Graceful demo fallback**: Every service has `isDemoMode()` fallback with Korean mock data. Enables zero-infrastructure prototyping.
- **Multi-provider LLM fallback**: OpenAI -> Anthropic -> Google sequential fallback in `llm.ts`.
- **Single schema file**: All 9 tables in one `db/schema.ts` with clean relations.
- **Custom pgvector type**: Proper Drizzle customType for 1536-dim embedding vectors.
- **TypeScript throughout**: End-to-end type safety.

### 7.2 Weaknesses (단점)

- **No state machine / orchestration**: Sequential LLM calls only. No retry, no branching, no error recovery chains. The resume refinement pipeline (`Draft -> Evaluate -> Improve`) is a simple sequential chain without error handling between steps.
- **No streaming for most endpoints**: Only interview chat uses SSE streaming. Resume refinement, ATS analysis, and Q&A generation are synchronous.
- **No rate limiting**: API endpoints have no rate limiting middleware.
- **No logging infrastructure**: No structured logging (e.g., Pino, Winston).
- **No test suite**: No test files, no test framework configured.
- **No CI/CD configuration**: No GitHub Actions, no linting scripts.

### 7.3 Opportunities (개선 기회)

- **AI SDK v6+ Agent patterns**: Could replace manual sequential chains with `ToolLoopAgent` for more robust orchestration
- **Nuxt UI v4 components**: 55+ accessible primitives would dramatically improve the UI
- **Drizzle v1**: Performance improvements via JIT mappers, better type safety
- **Nuxt 4 + Nuxt 5 prep**: SSR streaming, better DX, performance gains

---

## 8. Modernization Roadmap (모던화 로드맵)

### Phase 1: Security & Critical Fixes (즉시)

| Task | Priority | Effort |
|---|---|---|
| Upgrade `drizzle-orm` to 0.45.2 (security fix) | CRITICAL | Low |
| Upgrade `drizzle-kit` to 0.31.10 | HIGH | Low |
| Add `zod` as explicit dependency | HIGH | Low |
| Remove hardcoded secrets from docker-compose.yml | HIGH | Low |
| Remove deprecated `version` key from docker-compose.yml | LOW | Trivial |

### Phase 2: Framework Upgrade (1-2주)

| Task | Priority | Effort |
|---|---|---|
| Nuxt 3.15 -> Nuxt 4.5 (run `npx nuxt upgrade --dedupe`) | CRITICAL | Medium |
| Adopt `app/` directory structure | HIGH | Medium |
| Remove `nuxt-auth-utils` module (unused) | MEDIUM | Low |
| Remove unused deps (`lucide-vue-next`, `clsx`, `tailwind-merge`) | LOW | Low |

### Phase 3: UI & AI Stack (2-4주)

| Task | Priority | Effort |
|---|---|---|
| Nuxt UI v2 -> v4 (complete rewrite of component usage) | HIGH | HIGH |
| Tailwind CSS v3 -> v4 (CSS-based config) | HIGH | Medium |
| Vercel AI SDK v4 -> v7 (multi-step migration) | HIGH | HIGH |
| Update AI models to latest generations | HIGH | Medium |
| Migrate to Server Actions for streaming (v6+ pattern) | MEDIUM | Medium |

### Phase 4: Architecture Improvements (선택)

| Task | Priority | Effort |
|---|---|---|
| Add structured logging (Pino) | MEDIUM | Low |
| Add rate limiting middleware | MEDIUM | Low |
| Add Vitest test framework + basic tests | MEDIUM | Medium |
| Consider LangGraph or AI SDK Agent patterns for orchestration | LOW | HIGH |
| Add CI/CD (GitHub Actions) | LOW | Medium |

---

## 9. File Inventory (파일 목록)

### Root Config

| File | Status | Notes |
|---|---|---|
| `package.json` | UPDATE NEEDED | Multiple version bumps required |
| `nuxt.config.ts` | UPDATE NEEDED | Nuxt 4 config changes |
| `tsconfig.json` | Review | May need split contexts for Nuxt 4 |
| `drizzle.config.ts` | Review | drizzle-kit upgrade may change config format |
| `Dockerfile` | OK | Node 22 Alpine is current |
| `docker-compose.yml` | UPDATE NEEDED | Remove `version`, fix secrets |
| `.env.example` | OK | Template is fine |
| `.gitignore` | OK | Standard Nuxt ignores |

### Documentation

| File | Status | Notes |
|---|---|---|
| `README.md` | UPDATE NEEDED | References Nuxt 3, old models, old versions |
| `docs/implementation_plan.md` | MOVED | Relocated from root |
| `docs/PROJECT_ANALYSIS_REPORT.md` | NEW | This report |

### Database

| File | Status | Notes |
|---|---|---|
| `db/schema.ts` | OK (after ORM upgrade) | Clean schema, custom pgvector type works |
| `db/index.ts` | OK | Standard connection pool |

### Server Services

| File | Status | Notes |
|---|---|---|
| `server/services/llm.ts` | UPDATE NEEDED | Model IDs need updating for AI SDK v7 |
| `server/services/resume.ts` | Review | May need Zod schema updates for AI SDK v7 |
| `server/services/interview.ts` | Review | Streaming API may change |
| `server/services/ats.ts` | Review | Structured output API may change |
| `server/services/humanizer.ts` | Review | Structured output API may change |
| `server/services/qa.ts` | Review | Structured output API may change |
| `server/services/career.ts` | OK | pgvector search logic is stable |
| `server/services/embedding.ts` | OK | text-embedding-3-small is current |
| `server/services/parser.ts` | OK | pdfjs-dist and mammoth are stable |

### Server API Routes

| File | Status |
|---|---|
| `server/middleware/auth.ts` | OK |
| `server/api/auth/*.ts` | OK |
| `server/api/resumes/*.ts` | OK |
| `server/api/interviews/*.ts` | OK |
| `server/api/ats/*.ts` | OK |
| `server/api/humanizer/*.ts` | OK |
| `server/api/qa/*.ts` | OK |
| `server/api/careers/*.ts` | OK |

### Frontend

| File | Status |
|---|---|
| `app/app.vue` | Review (Nuxt UI v4 `<UApp>` wrapper needed) |
| `app/assets/css/main.css` | UPDATE NEEDED (Tailwind v4 migration) |
| `app/components/*.vue` | UPDATE NEEDED (Nuxt UI v4 component API changes) |
| `app/pages/**/*.vue` | Review (Nuxt UI component references) |

---

## 10. Conclusion (결론)

Kairos는 구조적으로 잘 설계된 프로젝트이지만, **Antigravity IDE의 LLM 지식 컷오프로 인해 2024년 말~2025년 초 시점의 의존성 버전과 모델로 고정**되어 있다. 현재(2026년 7월) 기준:

- **Nuxt 3는 3일 뒤 EOL** - 즉시 업그레이드 필요
- **Vercel AI SDK는 3개 메이저 버전 뒤처짐** - 에이전트 패턴 등 핵심 기능 누락
- **Nuxt UI는 2개 메이저 버전 뒤처짐** - 완전한 리라이트 필요
- **LLM 모델은 모두 구세대** - 최신 모델 대비 추론 능력·지식 범위 크게 부족
- **Drizzle ORM에 보안 취약점 존재** - 즉시 패치 필요

**우선순위**: 보안 패치(Drizzle) > Nuxt 4 업그레이드 > AI SDK 마이그레이션 > Nuxt UI v4 마이그레이션

---

*This report was generated by analyzing 55 source files, 45 lines of package.json, web searches across 40+ sources, and cross-referencing against live release databases for all major dependencies.*
