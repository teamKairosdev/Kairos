# Kairos 프로젝트 현황 분석 보고서
> 분석일: 2026-07-30 | 분석 범위: 환경변수 설계, 다크모드, 계획서 진행 상황 전반

---

## 1. 환경변수(환변) 설계 — 현실적 진단

### 현재 구조 (`nuxt.config.ts` + `.env.example`)

| 변수명 | 선언 위치 | `nuxt.config.ts` 매핑 | 실제 코드 사용 |
|--------|-----------|----------------------|--------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | `.env.example` ✅ | `runtimeConfig.googleApiKey` ✅ | `server/services/llm.ts`, `embedding.ts` |
| `GOOGLE_API_KEY` | ❌ 없음 | fallback으로 참조 | `llm.ts` 이중 fallback |
| `DATABASE_URL` | `.env.example` ✅ | `runtimeConfig.databaseUrl` ✅ | `db/index.ts`, `drizzle.config.ts` |
| `GOOGLE_CLIENT_ID` | `.env.example` ✅ | `runtimeConfig.googleClientId` ✅ | `server/auth.ts` |
| `GOOGLE_CLIENT_SECRET` | `.env.example` ✅ | `runtimeConfig.googleClientSecret` ✅ | `server/auth.ts` |
| `VERCEL_AI_GATEWAY_URL` | `.env.example` ✅ | ❌ **runtimeConfig에 없음** | `llm.ts` 직접 `process.env` 접근 |
| `VERCEL_AI_GATEWAY_KEY` | `.env.example` ✅ | ❌ **runtimeConfig에 없음** | **아무도 안 씀!** |
| `UPSTASH_REDIS_REST_URL` | ❌ **없음** | ❌ **없음** | — |
| `UPSTASH_REDIS_REST_TOKEN` | ❌ **없음** | ❌ **없음** | — |
| `BETTER_AUTH_SECRET` | ❌ **없음** | ❌ **없음** | — |
| `NUXT_SESSION_PASSWORD` | 옛날 docker-compose에 하드코딩 (제거됨) | ❌ **없음** | — |

### 문제점 요약

#### ❌ 심각 (Critical)

1. **`BETTER_AUTH_SECRET` 완전 누락**  
   `server/auth.ts`에서 `betterAuth()`를 호출하는데 `secret` 옵션이 없다.  
   Better Auth는 내부 HMAC 서명/검증에 secret이 **필수**. 지금 코드는 secret 없이 돌아가거나, 환경변수를 알아서 탐색한다.  
   `.env.example`에 `BETTER_AUTH_SECRET=` 항목 자체가 **없다**.

2. **`UPSTASH_REDIS_*` 완전 누락**  
   `COMPLETION_REPORT.md`에는 Upstash Rate Limit을 도입했다고 적혀있지만, `rateLimit.ts`를 보면 **실제로는 Upstash 없이 순수 메모리 Map**으로만 구현되어 있다.  
   → Upstash 환변도 없고, 코드도 사용 안 함. 계획서와 구현이 불일치.

3. **`llmCache.ts`도 마찬가지**  
   Redis 기반 Semantic Cache라고 문서에 적혀있지만, 실제 코드는 **`new Map()`** (인메모리). Upstash 연결 코드 없음.

#### ⚠️ 중간 (Warning)

4. **`VERCEL_AI_GATEWAY_URL`이 `runtimeConfig`에 없음**  
   `nuxt.config.ts`의 `runtimeConfig`에 등록되지 않아서, 서버 측에서 `process.env`를 직접 참조. Nuxt 권장 패턴 위반.

5. **`VERCEL_AI_GATEWAY_KEY`는 선언만 있고 아무 코드도 사용 안 함**  
   `.env.example`에 있는데 실제 어디서도 읽지 않음. 데드 변수.

6. **`GOOGLE_API_KEY` (별칭 fallback)**  
   `llm.ts`에 `process.env.GOOGLE_API_KEY`를 fallback으로 두고 있지만 `.env.example`에는 없음. 혼란 유발.

#### ✅ 잘 된 것

- `DATABASE_URL` → `runtimeConfig.databaseUrl` 패턴 올바름
- `GOOGLE_GENERATIVE_AI_API_KEY` → `runtimeConfig.googleApiKey` 패턴 올바름
- 하드코딩 시크릿은 `docker-compose.yml`에서 제거됨 (COMPLETION_REPORT 확인)
- `nuxt.config.ts`에서 `colorMode.preference: 'light'`, `fallback: 'light'`로 강제 라이트모드 설정 **→ 올바름**

---

## 2. 다크모드 — 현재 상태

`nuxt.config.ts`에 명확히:
```ts
colorMode: {
  preference: 'light',
  fallback: 'light',
},
```

CSS 전체 grep 결과 `dark-mode`, `darkMode`, `prefers-color-scheme: dark` **→ 0건**

**결론: 다크모드 코드 없음. 완전 라이트모드 전용. ✅**

단, `@seed-design/css/base.css`를 import하는데, SEED Design의 CSS 변수가 내부적으로 다크모드 CSS 변수를 정의할 수 있음. 명시적 코드 다크모드는 없음.

---

## 3. 계획서 진행 상황 — 현재 어디에 있나

### 계획서 위치 구조
```
docs/
├── PROJECT_ANALYSIS_REPORT.md    ← 2026-07-28 기술 부채 분석 (완료)
├── MODERNIZATION_PLAN.md         ← Phase 0-8 모던화 계획서 (완료)
├── COMPLETION_REPORT.md          ← Phase 0-8 실행 완료 보고 (2026-07-29)
├── implementation_plan.md        ← 초기 구현 계획 (구버전)
└── Idea-Real_tion/계획서/
    ├── KAIROS_MASTER_PLAN.md     ← 대회/서비스 마스터 기획
    ├── implementation_plan.md    ← Phase 1-6 실행 계획서
    ├── task.md                   ← 태스크 체크리스트 (전부 [x])
    ├── UXUI_전략_기획서.md        ← UX 전략 (기획 완료)
    └── D2_예선_긴급계획.md        ← 7/31 예선 긴급 계획
```

### 단계 진행 상태

| Phase | 내용 | 기록상 상태 | 실제 코드 확인 상태 |
|-------|------|------------|-------------------|
| **Phase 0** | 보안 패치 (Drizzle, zod, secrets) | ✅ 완료 | ✅ 코드 확인됨 |
| **Phase 1** | Nuxt 3→4, UI v2→v4 업그레이드 | ✅ 완료 | ✅ `nuxt.config.ts` v4 확인 |
| **Phase 2** | AI SDK v4→v7, 클라이언트 AI | ✅ 완료 | ✅ `llm.ts` v7 패턴 확인 |
| **Phase 3** | Better Auth 전환 | ✅ 완료 | ⚠️ secret 누락 이슈 있음 |
| **Phase 4** | Neon + Upstash Rate Limit | ✅ 완료 | ❌ Upstash는 가짜 구현 (인메모리) |
| **Phase 5** | LLM Cost Optimization | ✅ 완료 | ❌ llmCache도 인메모리 Map |
| **Phase 6** | PWA + Offline | ✅ 완료 | ✅ nuxt.config.ts PWA 확인 |
| **Phase 7** | API Route 재설계 | ✅ 완료 | ✅ 서버 구조 확인 |
| **Phase 8** | Nuxt UI v4 마이그레이션 | ✅ 완료 | ✅ SEED Design CSS 통합 확인 |
| **D-2 예선** | 7/31 예선 대응 | task.md [x] | 실제 실행 여부 불명 |

### 핵심 진단

task.md의 모든 항목이 `[x]`로 표시되어 있지만, Phase 4(Upstash), Phase 5(Redis Cache)는 **계획서 대비 실제 구현이 fallback(인메모리)으로 대체**되어 있음. 문서와 코드 간 불일치.

---

## 4. 종합 현실 진단

### 잘 된 것 ✅
- Nuxt 4 `compatibilityVersion: 4` + `app/` 디렉토리 구조 적용됨
- Better Auth로 JWT 수동 구현 대체됨 (구조적으로 올바름)
- 다크모드 완전 비활성화 (라이트모드 고정)
- LLM을 Google Gemini (`gemini-2.0-flash-001`) 단일 provider로 단순화
- PWA 기본 설정 있음
- Rate Limit 미들웨어 존재 (인메모리지만 동작은 함)
- SEED Design CSS 통합됨

### 실제로 안 된 것 ❌
- `BETTER_AUTH_SECRET` 환변 누락 → **인증 시스템 보안 허점**
- Upstash Redis 환변 없음 → Redis 기능 전부 인메모리 fallback
- `VERCEL_AI_GATEWAY_KEY` 선언만 있고 코드 미사용
- `VERCEL_AI_GATEWAY_URL`이 `runtimeConfig`에 미등록
- llmCache가 서버 재시작 시 전부 날아가는 인메모리 구조
- `.env.example`이 실제 필요한 변수를 다 커버 못 함

### 가장 시급한 것
1. `.env.example`에 `BETTER_AUTH_SECRET=`, `UPSTASH_REDIS_REST_URL=`, `UPSTASH_REDIS_REST_TOKEN=` 추가
2. `nuxt.config.ts` runtimeConfig에 `vercelAiGatewayUrl`, `vercelAiGatewayKey` 등록
3. `server/auth.ts`에 `secret: process.env.BETTER_AUTH_SECRET` 명시
