# Kairos 작업 로그 (task.md)

> **규칙**: 작업을 시작할 때마다 이 파일에 할 작업을 전부 기록하고, 작업이 끝나면 완료된 항목을 체크(`[x]`)한다. 작업 완료 시마다 **한국어 메시지 + 영어 접두어**(예: `feat:`, `refactor:`, `fix:`, `docs:`, `chore:`)로 커밋한다. **push는 하지 않는다.**

---

## 세션 0: Next.js 단일 프레임워크 전환 + AI SDK 제거 (2026-08-01)

### 0. 파악 단계
- [x] 병렬 서브에이전트 4개로 프로젝트 전체 구조 파악 (Next.js 이전 현황, LLM/AI SDK 사용처, Astro/Nuxt 잔재, 문서/상태)

### 1. LLM 직접 구현 (AI SDK 완전 제거)
- [x] `src/server/llm.ts` — Gemini REST 직접 호출로 전면 재작성 (`callLLMText`, `callLLMStructured` zod→OpenAPI, `streamLLMText` SSE 파싱)
- [x] `src/server/embedding.ts` — `embedContent` 직접 호출
- [x] `src/server/imageGen.ts` — Imagen `predict` 직접 호출 (신규)
- [x] `src/app/api/llm/{chat,stream,refine}/route.ts` — 직접 구현으로 교체
- [x] `src/app/api/interviews/[id]/chat/route.ts` — 직접 구현으로 교체
- [x] `src/hooks/useChat.ts` — 커스텀 채팅 훅 신규 (AI SDK `useChat` 대체, 전 채팅 UI가 임포트)
- [x] `interview/[id]/page.tsx` — 커스텀 `useChat`으로 전환
- [x] `src/lib/mockInterceptor.ts` — plain text 스트림 포맷으로 수정
- [x] `package.json`에서 `ai`, `@ai-sdk/google`, `@ai-sdk/react` 제거

### 2. Nitro 레거시 → Next.js 포팅
- [x] 서비스 8개 포팅: `companyMeta`, `publicSkillGap`, `mfa`, `guardrail`, `context`, `interview`, `parser`, `resume` → `src/server/`
- [x] API 라우트 5개 포팅: `company/meta`, `public/skill-gap`, `auth/mfa/{enable,setup,verify}` → `src/app/api/`
- [x] interview 채팅에 컨텍스트 윈도우(`buildContextWindow`) + 세션 소유권 검증 연동
- [x] `server/` (Nitro) 디렉토리 삭제

### 3. Astro 발표자료 완전 제거
- [x] `apps/astro/`, `public/presentation/`, `scripts/copy-astro.mjs`, `.astro/` 삭제
- [x] `next.config.ts` — `/presentation` rewrite 제거
- [x] `vercel.json` — `next build` + `.next` + rewrite 제거
- [x] 발표자료 `src/app/presentation/page.tsx` 이전 (10슬라이드, 해시/키보드/터치 내비게이션) + 테크 슬라이드 Next.js 단일 스택으로 갱신

### 4. 스튜디오 라우트 정리 (404 버그 수정)
- [x] `/api/studio/generate`, `/api/studio/images`, `/api/studio/images/[id]` 라우트 신규 생성
- [x] 구 `/api/studio/route.ts` 삭제

### 5. 인프라/정리
- [x] `.nuxt/`, `.output/`, `i18n/` (Nuxt 포맷) 삭제
- [x] `@/../db` 비정상 import 10개 파일 → `@/db`로 수정
- [x] 테스트 9개 파일 `src/server/` 재타깃 + `llm.test.ts` 전면 재작성 (fetch 모킹) — 61개 테스트 통과
- [x] `vitest.config.ts` alias 정리, `test/setup.ts` useRuntimeConfig 스텁 제거
- [x] `tsconfig.json` exclude 정리 (`server`, `apps`, `app`, `nuxt.config.ts` 제거)
- [x] `README.md` Next.js 15 기준 전면 재작성 (LLM 아키텍처 다이어그램 포함)
- [x] Tailwind v4 설치 (`tailwindcss`, `@tailwindcss/postcss`) + `postcss.config.mjs` 생성 (빌드 실패 수정)
- [x] `next.config.ts` — `serverExternalPackages` 마이그레이션, `outputFileTracingRoot` 추가
- [x] 라우트 `params: Promise` 타입 수정 (`careers/[id]`, `chat/[id]`, `docs/[id]`, `community/[id]`)
- [x] `vitest` devDependency + `test`/`test:coverage` 스크립트 등록
- [x] 최종 검증: `npm run build` 성공 / `npx tsc --noEmit` 에러 0 / `npm test` 61/61 통과
- [x] `.next/` 빌드 산출물이 커밋에 포함된 것 발견 → `.gitignore`에 `.next/` 추가, 추적에서 제거 후 amend 정리
- [x] 커밋 완료 (`5045b7d`, push 안 함)

---

## 이후 작업 예정 (미완)
- [ ] `project_status_report.md` 등 낡은 문서 정리 (선택)
- [ ] `docs/` 마스터 플랜 문서 최신화 (선택)
