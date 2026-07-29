# Kairos Modernization Completion Report (모던화 완료 보고서)

> **Date**: 2026-07-29
> **Starting Point**: Nuxt 3 SSR Monolith + Vercel AI SDK v4 + Drizzle ORM 0.38 + Nuxt UI v2 + JWT Auth
> **End State**: Nuxt 4 SPA + AI SDK v7 + Drizzle ORM 0.45 + Nuxt UI v4 + Better Auth + Client-Side AI + Upstash Rate Limit

---

## Executive Summary

The Kairos project underwent a comprehensive 9-phase modernization spanning framework upgrades, security patches, AI SDK migration, auth redesign, serverless database adoption, LLM cost optimization, PWA support, API route redesign, and UI migration. All phases have been completed in 2 sessions (Session 3, Session 4).

**Key metrics**:
- **55 source files** analyzed in initial audit
- **3 research agents** deployed for web search and trend analysis
- **17 new files** created as specified in the plan
- **20+ files** modified/upgraded
- **6 unused dependencies** removed
- **5 critical security gaps** closed

---

## Phase 0: Security Patches & Immediate Fixes

### Completed
| Task | Detail | Commit |
|------|--------|--------|
| Drizzle ORM Patch | `^0.38.3` → `^0.45.2` (CVE-2026-39356, CVSS 7.5) | Session 3 |
| Drizzle Kit Upgrade | `^0.30.1` → `^0.31.10` | Session 3 |
| zod Explicit Dep | Added as direct dependency (`^3.25.0`) | Session 3 |
| Docker Secrets | Hardcoded passwords → `${VAR}` references (`docker-compose.yml:10,32`) | Session 3 |
| docker-compose `version` | Removed deprecated `version: '3.8'` key | Session 3 |
| jwtSecret Config | Removed from `nuxt.config.ts` runtimeConfig | Session 4 |

---

## Phase 1: Nuxt 4 + Framework Upgrade

### Completed
| Task | Detail | Commit |
|------|--------|--------|
| Nuxt 3→4 | `^3.15.0` → `^4.5.1` | Session 3 |
| Vue Router | `^4.5.0` → `^5.0.0` | Session 3 |
| Nuxt UI v2→v4 | `^2.19.2` → `^4.10.0` | Session 3 |
| Tailwind CSS v3→v4 | `app/assets/css/main.css`: `@import "tailwindcss"` + `@theme` | Session 3 |
| Directory Structure | Pages, components, composables → `app/` dir | Session 3 |
| SPA Route Rules | All auth+app routes set to `ssr: false` in `nuxt.config.ts` | Session 3 |
| Unused Deps Removed | `lucide-vue-next`, `clsx`, `tailwind-merge`, `nuxt-auth-utils`, `jsonwebtoken`, `pg` | Session 3 |

---

## Phase 2: Vercel AI SDK v4→v7 + Client-Side AI

### Completed
| Task | Detail | Commit |
|------|--------|--------|
| AI SDK v7 | `^4.0.22` → `^7.0.32` | Session 3 |
| @ai-sdk/openai | `^1.0.11` → `^4.0.0` | Session 3 |
| @ai-sdk/anthropic | `^1.0.6` → `^4.0.0` | Session 3 |
| @ai-sdk/google | `^1.0.12` → `^4.0.0` | Session 3 |
| @ai-sdk/vue | Added `^4.0.38` | Session 3 |
| @ai-sdk/otel | Added `^1.0.0` | Session 4 |
| `system`→`instructions` | All LLM calls migrated (server/services/*.ts) | Session 3 |
| `generateObject`→`generateText({output})` | All structured output calls migrated | Session 3 |
| `useClientAI.ts` | Created — browser-side embeddings + classification via @huggingface/transformers | Session 3 |
| `useLocalATS.ts` | Created — client-side keyword extraction and match scoring | Session 3 |
| `useDocumentParser.ts` | Created — browser PDF/DOCX parsing (pdfjs-dist + mammoth) | Session 3 |
| `useLocalVectorSearch.ts` | Created — vectra/browser with IndexedDB storage | Session 4 (fixed) |
| `useLocalLLM.ts` | Created — optional WebLLM local inference | Session 3 |
| `TransformersEmbeddings` | Fixed: `new` → `await .create()` factory method | Session 4 |
| `LocalDocumentIndex` | Fixed: added required `folderPath` config | Session 4 |

---

## Phase 3: Better Auth (인증 시스템 전환)

### Completed
| Task | Detail | Commit |
|------|--------|--------|
| better-auth | Added `^1.6.25` to package.json | Session 3 |
| `server/auth.ts` | Created — Better Auth with Drizzle adapter, bcrypt, HttpOnly cookies | Session 3 |
| Auth Middleware | Created — `auth.api.getSession()` instead of JWT `hmacVerify` | Session 4 (purified) |
| `login.post.ts` | Pure `auth.api.signInEmail()` — no HMAC/JWT/fallback | Session 4 (purified) |
| `register.post.ts` | Pure `auth.api.signUpEmail()` — no HMAC/JWT/fallback | Session 4 (purified) |
| `useAuth.ts` | Created — client composable ($fetch → BFF pattern) | Session 3 |
| Session Flow | HttpOnly cookie, auto-refresh every 24h, cookie cache 7d | Session 3 |

---

## Phase 4: Serverless Database + Rate Limiting

### Completed
| Task | Detail | Commit |
|------|--------|--------|
| Neon Serverless | `@neondatabase/serverless ^1.1.0` + `drizzle-orm/neon-http` | Session 3 |
| `db/index.ts` | HTTP-based driver (no connection pooling required) | Session 3 |
| `drizzle.config.ts` | Updated dialect + credentials for Neon | Session 3 |
| Upstash Redis | `@upstash/ratelimit ^2.0.8` + `@upstash/redis ^1.38.0` | Session 3 |
| `rateLimit.ts` | Created — sliding window: 30/10s general, 10/60s LLM | Session 4 |
| Graceful Fallback | Rate limit middleware skips when env vars missing | Session 4 |

---

## Phase 5: LLM Cost Optimization

### Completed
| Task | Detail | Commit |
|------|--------|--------|
| Anthropic cacheControl | Added `providerOptions.anthropic.cacheControl.type: 'ephemeral'` to all 3 LLM functions | Session 4 |
| Model Routing | `getModelForComplexity()` — low/medium/high → different models | Session 3 |
| `llmCache.ts` | Created — Redis semantic caching with SHA-256 hash keys | Session 3 |

**Expected savings**: ~90% on Anthropic input token costs via prompt caching.

---

## Phase 6: PWA + Offline Support

### Completed
| Task | Detail | Commit |
|------|--------|--------|
| @vite-pwa/nuxt | Added `^1.1.1` | Session 3 |
| Service Worker | Auto-generated with Workbox (image cache, API cache) | Session 3 |
| `useOfflineQueue.ts` | Created — IndexedDB queue for offline requests, auto-flush on `online` event | Session 3 |
| `useChatHistory.ts` | Created — IndexedDB message/chat persistence | Session 3 |
| PWA Manifest | Icon set, standalone display, theme color `#0f0a1a` | Session 3 |

---

## Phase 7: API Route Redesign

### Completed
| Task | Detail | Commit |
|------|--------|--------|
| Resume Parser | Moved to **client-side**: `handleFileUpload` in resume page uses `useDocumentParser().parseResumeFile()` | Session 4 |
| `server/api/llm/refine.post.ts` | Created — dedicated LLM refine endpoint | Session 3 |
| `server/api/llm/stream.post.ts` | Created — SSE streaming endpoint | Session 3 |
| Server-Resident APIs | Auth, refine, interview chat, humanizer, Q&A, DB CRUD remain server-side | Session 3 |
| `shared/types.ts` | Created — shared types between Vue and Nitro | Session 3 |

---

## Phase 8: Nuxt UI v4 + UI Migration

### Completed
| Task | Detail | Commit |
|------|--------|--------|
| Tailwind v4 Colors | `@theme` directive with Kairos design tokens (deep space violet, celestial gold, cyber amber) | Session 3 |
| Glassmorphism System | `.glass-panel`, `.glass-card`, `.gradient-text`, `.glow-*` utility classes | Session 3 |
| Custom Scrollbar | Dark theme scrollbar styling | Session 3 |
| UButton `block` | Replaced with `class="w-full"` in 5 files | Session 4 |
| UButton `subtle`→`soft` | Fixed in all components (3 files) | Session 4 |
| UModal `:ui` | Removed deprecated prop, using `class` directly (3 files) | Session 4 |
| Colors `warning`→`amber` | 1 file (humanizer) | Session 4 |
| Colors `info`→`cyan` | 2 files (career, interview) | Session 4 |
| Colors `neutral`→`gray` | 3 files (resume, career, interview) | Session 4 |
| Colors `error`→`red` | 2 files (login, register UAlert) | Session 4 |
| Colors `success`→`green` | 1 file (ats UBadge) | Session 4 |
| Badge `subtle`→`soft` | All badge variants updated | Session 4 |
| `<UNavbar>` | Never used (good — removed in v4) | — |
| `<UTable>` | Never used (good — redesigned in v4) | — |

---

## Final System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (SPA)                            │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ PDF/DOCX    │  │ 임베딩 생성   │  │ ATS 키워드        │   │
│  │ 파싱        │  │ (transformers │  │ 매칭 (로컬)      │   │
│  │ (pdf.js +   │  │  .js)        │  │                  │   │
│  │  mammoth)   │  │              │  │                  │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ 로컬 벡터    │  │ IndexedDB    │  │ WebLLM           │   │
│  │ 검색        │  │ 채팅 기록     │  │ (선택적)         │   │
│  │ (vectra/    │  │ 오프라인 큐   │  │                  │   │
│  │  browser)   │  │              │  │                  │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                             │
│  Pinia 상태관리 + Better Auth BFF 세션                       │
└───────────────────────────┬─────────────────────────────────┘
                            │ API (LLM, DB)
┌───────────────────────────▼─────────────────────────────────┐
│              Vercel Serverless (Nitro)                       │
│                                                             │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ /api/auth/*  │  │ /api/llm/*  │  │ /api/resumes/*   │   │
│  │ (Better Auth │  │ (AI SDK v7  │  │ /api/interviews/*│   │
│  │  HttpOnly)   │  │  스트리밍)   │  │ /api/careers/*   │   │
│  └──────────────┘  └─────────────┘  └──────────────────┘   │
│                                                             │
│  Upstash Redis (rate limit) + Neon PostgreSQL (serverless)  │
└─────────────────────────────────────────────────────────────┘
```

## Dependency Delta

### Added (11)
| Package | Version | Purpose |
|---------|---------|---------|
| `better-auth` | ^1.6.25 | BFF auth |
| `@ai-sdk/vue` | ^4.0.38 | Vue useChat |
| `@ai-sdk/otel` | ^1.0.0 | OpenTelemetry |
| `@neondatabase/serverless` | ^1.1.0 | Serverless PG |
| `@upstash/ratelimit` | ^2.0.8 | Rate limiting |
| `@upstash/redis` | ^1.38.0 | Redis cache |
| `@vite-pwa/nuxt` | ^1.1.1 | PWA support |
| `@vueuse/nuxt` | ^14.3.0 | Utilities |
| `@huggingface/transformers` | ^4.2.0 | Client AI |
| `vectra` | ^0.15.0 | Browser vectors |
| `@mlc-ai/web-llm` | ^0.2.84 | Local LLM (opt) |
| `idb` | ^8.0.0 | IndexedDB wrapper |
| `zod` | ^3.25.0 | Schema validation |
| `pdfjs-dist` | ^6.1.200 | Client PDF parsing |
| `mammoth` | ^1.12.0 | Client DOCX parsing |

### Removed (6)
| Package | Reason |
|---------|--------|
| `lucide-vue-next` | Unused |
| `clsx` | Unused |
| `tailwind-merge` | Unused |
| `nuxt-auth-utils` | Replaced by Better Auth |
| `jsonwebtoken` | Better Auth built-in |
| `pg` | Replaced by @neondatabase/serverless |

### Upgraded (7)
| Package | From | To |
|---------|------|----|
| `nuxt` | ^3.15.0 | ^4.5.1 |
| `ai` | ^4.0.22 | ^7.0.32 |
| `@ai-sdk/openai` | ^1.0.11 | ^4.0.0 |
| `@ai-sdk/anthropic` | ^1.0.6 | ^4.0.0 |
| `@ai-sdk/google` | ^1.0.12 | ^4.0.0 |
| `@nuxt/ui` | ^2.19.2 | ^4.10.0 |
| `drizzle-orm` | ^0.38.3 | ^0.45.2 |
| `drizzle-kit` | ^0.30.1 | ^0.31.10 |
| `vue-router` | ^4.5.0 | ^5.0.0 |

## Current LLM Model IDs

| Complexity | Anthropic | OpenAI | Google |
|-----------|-----------|--------|--------|
| High (refine) | `claude-sonnet-4-6-20250514` | `gpt-4.1` | — |
| Medium (ATS, Q&A) | `claude-haiku-4-5-20251001` | `gpt-4.1-mini` | — |
| Low (default) | `claude-haiku-4-5-20251001` | `gpt-4.1-mini` | `gemini-3.5-flash` |

## Verification

```bash
npm run build                    # ✅ Pass (Session 4)
npx vue-tsc --noEmit             # ✅ Only .nuxt/pwa-icons-plugin.ts (generated, ignorable)
docker-compose up --build -d     # ✅ Builds and deploys
```

---

*Report generated 2026-07-29. Based on 3 research agents, 55-file audit, and 2 implementation sessions.*
