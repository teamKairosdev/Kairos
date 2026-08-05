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

## 세션 1: 레거시 잔재 대청소 (2026-08-01)

### 1. 파일/디렉토리 삭제
- [x] 세션 아카이브 `_AGENTS_BRAIN_/sessions/` (s1~s11) 전체 삭제
- [x] 과거 문서 `docs/` (archive/기획서/마스터플랜/디자인시스템 가이드) 전체 삭제
- [x] 낡은 루트 문서 삭제: `project_status_report.md`, `payload.config.ts` (미사용 CMS 설정)
- [x] 타 프로젝트 잔재 `ChaekList-develop/` 삭제
- [x] 미사용 `contracts/KairosSubscription.sol`, `seed-design/ui/` (미사용 컴포넌트 4개) 삭제
- [x] 빈 디렉토리 `apps/`, `shared/` 정리 (단, `shared/types.ts`는 실제 사용 코드라 복원)
- [x] 유지: `ASSETS/` (브랜드 원본), `AI서비스측_심사기준표_PPT목차.md` 등 AI 심사 문서

### 2. 코드 잔재 정리
- [x] `tsconfig.json` exclude에서 `.nuxt`, `.output` 제거
- [x] `AuthContext.tsx`에서 `nuxt-color-mode` localStorage 설정 제거
- [x] `tsconfig.tsbuildinfo` 추적 제거 + `.gitignore`에 추가
- [x] `.gitignore` 헤더 "Nuxt & Vite" → "Build artifacts"로 갱신

### 3. 검증
- [x] `npx tsc --noEmit` 에러 0 / `npm test` 61/61 통과 / `npm run build` 성공
- [x] 커밋 완료 (push 안 함)

---

## 세션 2: 무손실 코드 최적화 (완료)

### 1. 분석 (병렬 서브에이전트 4개)
- [x] A: 미사용 의존성 제거 — `@rhwp/core`, `@rhwp/editor`, `yjs`, `@mlc-ai/web-llm` (참조 0건 검증 후 npm uninstall) / `public/sw.ts`·pwa 아이콘 3종 (미등록) 삭제
- [x] B: hooks·lib 영역 — 데드 훅 6종(`useChatHistory`, `useLocalVectorSearch`, `useOfflineQueue`, `useLocalATS`, `useSEOMeta`, `useAuth`)·`rateLimit.ts` 삭제, `mockInterceptor.ts` 17.4KB→11.2KB (중복 auth 분기/헬퍼 추출)
- [x] C: server·API 영역 — `llm.ts` config 병렬화 + `requestGemini`/`resolveModelAndConfig` 추출, 데드 함수 제거, `http.ts` 신규(unauthorized/badRequest/notFound/serviceUnavailable/internalError)로 35개 라우트 통일
- [x] D: UI 영역 — 공통 컴포넌트 추출(`Spinner` 12곳, `EmptyState`, `DifficultyBadge`), presentation 슬라이드 789줄을 `src/data/presentationSlides.tsx`로 분리, 데드 import/상수 정리

### 2. 결과
- [x] 84개 파일 변경: +393 / -1749줄 (네트 네거티브)
- [x] 검증: `npx tsc --noEmit` 0 / `npm test` 61/61 / `npm run build` 성공
- [x] 커밋 완료 (push 안 함)

---

## 세션 3: 무손실 보장 재검증 (완료)

### 병렬 검증 에이전트 (읽기 전용, 코드 수정 없음)
- [x] V1: UI 동작 보존 — ✅ Spinner 24곳/EmptyState 3곳/DifficultyBadge 2곳 교체 전후 classNames·구조·조건분기 동일, presentation 슬라이드 CSS 10,906자·JSX 13,668자 **완전 일치**, 내비게이션 로직 diff 0건
- [x] V2: API/서버 동작 보존 — ✅ 39개 라우트(주장 35개, 계수 차이) 1:1 대조로 상태코드·에러메시지 문자열(1자 차이 없음)·console.error 유지, llm.ts getConfig 병렬화/requestGemini 의미 보존, requireSession은 원래부터 사용처 0건인 순수 데드 코드였음
- [x] V3: 데드코드·의존성 무결 — ✅ 삭제된 4개 의존성·7개 파일·PWA 4자산 참조 0건, lockfile 일치(`npm install --package-lock-only --dry-run` up to date)
  - ⚠️ 추가 발견: 훅 삭제로 미사용이 된 의존성 3개(`vectra`, `@huggingface/transformers`, `idb`) → **삭제 완료** (참조 0건 재확인)
  - ⚠️ `isows→ws@*` missing은 삭제 이전부터 존재하던 문제로 무관 (보고만)

### 결과
- [x] 재검증 판정: **무손실 확인** — 렌더링·응답·에러 메시지·LLM 요청/파싱 전부 보존
- [x] 검증: `npx tsc --noEmit` 0 / `npm test` 61/61
- [x] 커밋 완료 (push 안 함)

---

## 이후 작업 예정 (미완)
- [ ] `docs/` 마스터 플랜 문서 최신화 (선택)

---

## 세션 4: HWP/HWPX 기능 @rhwp 기반 재구현 (진행 중)

### 1. 조사 (병렬 서브에이전트)
- [x] 현재 hwp/hwpx 처리 구현 분석 — hwplib-js 텍스트 추출만 가능(HWPX 미지원, 표/이미지 유실), 추출 텍스트 미저장, docs 상세 페이지 바이너리↔JSON 불일치로 **broken**, 뷰어/에디터/다운로드 전무
- [x] @rhwp/core·@rhwp/editor 패키지 API·Next.js 통합 방법 조사 — core(HWP+HWPX+HML, WASM 7.2MB, 브라우저 전용, `init({module_or_path})` + measureTextWidth 선등록), editor(iframe 임베드, loadFile/exportHwp·Hwpx/notifySaved). Next.js는 wasm을 public/ 복사만으로 동작, config 변경 불필요

### 2. 구현
- [x] `@rhwp/core@0.8.2`, `@rhwp/editor@0.8.2` 설치 + `scripts/copy-rhwp.mjs`(postinstall)로 wasm → `public/rhwp_bg.wasm` (gitignore)
- [x] `src/components/HwpViewer.tsx` — @rhwp/core SVG 페이지 뷰어 (동적 import, 페이지 네비게이션)
- [x] `src/components/HwpEditor.tsx` — @rhwp/editor iframe 에디터 (기존 문서 로드, HWP/HWPX 저장 → upload API → notifySaved, studioUrl은 `NEXT_PUBLIC_RHWP_STUDIO_URL`로 오버라이드 가능)
- [x] `/docs/edit` 페이지 신규 — 새 HWP 문서 작성/기존 문서 편집 (`?doc=`)
- [x] 업로드 라우트 — 추출 textContent를 메타데이터에 **영속화** (추출→저장 순서 조정)
- [x] `docs/[id]` 라우트 — `?text=1` JSON 엔드포인트 추가 (바이너리 GET은 유지)
- [x] `docs/[id]` 페이지 — 깨진 fetch(`res.json()`→바이너리) 수정, hwp/hwpx면 HwpViewer + 다운로드 + 편집 버튼
- [x] `docs` 목록 페이지 — `f.name`→`f.title` 선존 버그 수정(빈 파일명), "새 HWP 문서" 버튼 추가
- [x] mockInterceptor — 업로드 mock이 실제 파일명/ext 반영, `?text=1` mock 추가

### 3. 검증/한계
- [x] `npx tsc --noEmit` 0 / `npm test` 61/61 / `npm run build` 성공 (useSearchParams Suspense 수정 포함)
- [x] 커밋 완료 (push 안 함)
- [x] ~~알려진 한계~~ → **전부 해소**:
  - [x] **hwpx 텍스트 추출** — `src/lib/hwpTextExtract.ts` 신규 (@rhwp/core 전 섹션/문단 텍스트 추출), docs 업로드·이력서 플로우에서 클라이언트 추출 → 서버 `textContent` 필드로 영속화 (서버 추출 실패 폴백 유지)
  - [x] **에디터 외부 origin** — `NEXT_PUBLIC_RHWP_STUDIO_URL` env로 셀프호스팅 스튜디오 지정 가능 (.env.example에 문서화). 기본값은 공개 데모라 기밀 문서는 배포 시 env 설정 필요
  - [x] **mock 모드 뷰어** — mockInterceptor에 IndexedDB 파일 바이트 저장/조회/삭제 구현 → mock에서도 HWP 뷰어·텍스트 추출·바이너리 GET 동작

### 4. 세션 종료
- [x] **mock 모드는 유지하기로 결정** (제거하지 않음 — 데모/시연용 기능으로 계속 사용)
- [x] 작업 종료, task.md 최종 갱신 후 커밋

---

## 세션 5: 전 페이지 모바일 최적화 + any 타입 척결 (완료)

### 병렬 서브에이전트
- [x] A: auth/login·register, 홈, error, r/[id], presentation — 터치 타겟 44px 확대, 카드/인풋 반응형 패딩, flex-wrap/min-w-0 오버플로 방지, presentation ≤480px 모바일 스타일, any 4건 정리
- [x] B: docs(3)·career·interview(2)·qa·humanizer — 모달 `max-w-[calc(100vw-2rem)]`, 채팅 버블 min-w-0/break-words, 탭/헤더 flex-wrap, HWP 뷰어 래퍼 overflow 정리, any 0건 (인터페이스 8종 정의)
- [x] C: resume(2)·ats·studio·settings·admin — 탭 flex-wrap, 모바일 버튼 전체폭 스택, 채팅 패널 h-[60vh], 지갑/계정 any 제거, any 0건 (인터페이스 7종 정의)
- [x] D: server·api·lib·hooks·utils·data·components 전역 — **any 77건 → 0건** (zod infer/최소 인터페이스/Gemini 응답 타입/제네릭 readArray, catch(err: unknown) 전환, `internalError`가 err: unknown 수용)

### 결과
- [x] 보너스: 에이전트 영역에서 누락된 `AuthContext.tsx` any 4건 직접 정리 → **src 전체 any 0건**
- [x] 검증: `npx tsc --noEmit` 0 / `npm test` 61/61 / `npm run build` 성공
- [x] 69개 파일 변경 (+693/-339)
- [x] 커밋 완료 (push 안 함)

---

## 세션 6: README 전면 개편 (2026-08-02)

### 1. 병렬 서브에이전트 4개로 코드베이스 재조사 (문서 읽기 금지, 코드만)
- [x] A: App Router 구조 — 19페이지 + error.tsx, API 라우트 45개 전수, 라우트 그룹/레이아웃, `/presentation` + `src/data/presentationSlides.tsx` (10슬라이드)
- [x] B: 서비스 레이어 — `src/server/` 23개 모듈 전수, `llm.ts` (328행, Gemini REST, zod→OpenAPI, SSE), `embedding.ts`/`imageGen.ts` (env 직독, gateway 미지원), `llmCache.ts` 3개 라우트 적용
- [x] C: UI/DB — 컴포넌트 11개 전부 클라이언트 컴포넌트, **seed-design/ 디렉토리 미생성**(설정만 존재), Drizzle 16테이블 관계 전수, mock 50프로필, Tailwind v4 CSS-first
- [x] D: 설정/인프라 — rewrites 없음, `serverExternalPackages`, vercel icn1(서울), middleware 10경로 보호, packages/ 3개 목 스텁, 레거시 잔재 참조 7건 발견 (NUXT_* env fallback, PAYLOAD env, .gitignore .nuxt 등 — 파일은 전부 삭제 완료 상태)

### 2. README.md 전면 재작성
- [x] 오류 정정: Payload CMS / PWA / vectra·Transformers·idb / rateLimit / seed-design UI / contracts·docs 디렉토리 — **전부 실제로는 제거됨 → 삭제 반영**
- [x] Mermaid 다이어그램 5종 재작성: System Architecture (HWP Runtime/Demo Mode/미들웨어 추가), LLM Architecture (실제 라우트·모델·캐시·게이트웨이 옵션 정확화), Service Layer (23 서비스·45 핸들러·http.ts·getSession), ERD (16테이블, cascade/set null 명시)
- [x] 신규 섹션: HWP/HWPX 지원 (@rhwp), Auth & Sessions, Demo Mode, Deployment, Multi-Platform Bridges (목 스텁 명시), Env Variables 표
- [x] Tech Stack / Core Features 테이블 실제 의존성 기준으로 갱신 (hwplib-js, mammoth, pdfjs-dist, sonner, diff 등)

### 3. 발견 이슈 (후속 작업 후보, 이번 세션에서 수정 안 함)
- [ ] `/qa` → `GET /api/qa/list` 라우트 없음 (404) / `/humanizer` → `GET /api/humanizer/history` 없음 (404) / `/settings` 계정 삭제 `DELETE /api/auth/me` 없음 (405)
- [ ] `/qa` 페이지 `{targetRole, context}` vs 라우트 `{targetRole, careerSummary, count}` 불일치, `/humanizer` 페이지 `{text}` vs 라우트 `{originalText}` 불일치 (실제 모드 400)
- [ ] admin 페이지 stats 필드명 불일치 (전부 "-"), 설정 저장 PUT 405 — 실제 라우트 `POST /api/admin/settings/update` 미연동
- [ ] `resumes/[id]/refine` 세션 검증 없음, docs API 4개 인증 없음
- [ ] `initMockInterceptor` 데드 코드 (호출처 0건), `resume.ts`·`interview.ts` 앱 코드 미사용(테스트 전용)
- [ ] 스튜디오 이미지 `uploads/studio/` 정적 서빙 rewrite 없음 → URL 404 가능
- [ ] 사이드바 "커뮤니티" 링크 → `/community` 페이지 없음 (404)
- [ ] 레거시 env 참조 5곳 (`NUXT_JWT_SECRET` 등), `.env.example` PAYLOAD 키, tsconfig exclude `payload.config.ts`/`seed-design`, `.gitignore` `.nuxt/`·`.output/` 잔재
- [ ] MFA 라우트 3개 존재하나 UI 없음 (향후 확장용)

### 4. 검증/커밋
- [x] 커밋 완료 (push 안 함)

---

## 세션 7: 발견 이슈 전수 해결 (2026-08-02)

### 병렬 서브에이전트 6개로 세션 6에서 발견한 이슈 해결
- [x] A1: QA/Humanizer/Settings 계약 수정
  - `GET /api/qa/list`, `GET /api/humanizer/history` 라우트 신규 (세션 기반 50/20건 조회)
  - 페이로드 불일치 수정: qa 페이지 `{targetRole, careerSummary, count}`, humanizer 페이지 `{originalText}`
  - generate/process 응답을 DB 레코드 형태(`{id, targetRole, qaPairs, createdAt}`)로 통일 + demo id
  - `DELETE /api/auth/me` 신규 (계정 삭제 + 세션 쿠키 무효화)
- [x] A2: Admin 불일치 수정 — stats 라우트에 `recentUsers` 추가, 페이지 필드명/설정 GET 형태(`d.configs`)/저장 엔드포인트(`POST /api/admin/settings/update`) 정합
- [x] A3: docs API 4개 전부 인증 추가 (getSession → unauthorized) — 목록/업로드/파싱/다운로드/삭제
- [x] A4: 커뮤니티 페이지 신규 `(authenticated)/community` (카테고리 필터, 글 작성, 확장 뷰, 본인 글 삭제, 더 보기) + middleware `/community` 보호 추가
- [x] A5: 데드 코드 정리 — `initMockInterceptor`를 AuthContext에 연결(멱등 가드 추가, mock 로그인/마운트 시 동적 import), `src/server/resume.ts`·`interview.ts` + 전용 테스트 2개 **삭제** (라우트와 시그니처 불일치로 교체 불가 판정), 대신 refine 라우트에 **세션·소유권 검증 + guardrail L1/L3 적용**
- [x] A6: 스튜디오 이미지 404 해결 — `src/app/api/files/[...path]` 라우트 신규 (path traversal 가드, MIME 매핑) + next.config rewrite `/uploads/* → /api/files/*`, 레거시 잔재 제거 (auth.ts NUXT fallback 6곳, middleware NUXT_JWT_SECRET, .env.example PAYLOAD 키 제거 + NEXT_PUBLIC_APP_URL 추가, tsconfig exclude 정리, .gitignore .nuxt/.output 제거)

### 결과
- [x] 검증: `npx tsc --noEmit` 0 / `npm test` **55/55** (데드 서비스 테스트 2개 삭제로 61→55) / `npm run build` 성공 (57 라우트, `/community` 포함)
- [x] README 갱신: 테스트 7파일·55개, 라우트 48개, 서비스 21개, 페이지 20개, community/files 라우트 반영
- [x] 잔여 (의도적 유지): MFA 라우트 3개 UI는 향후 확장용으로 미구현
- [x] 커밋 완료 (push 안 함)

---

## 세션 8: 경쟁 UX 리서치 + 프론트 전체 UI/UX 대대적 개편 (2026-08-02)

### 1. 조사 (병렬 8개)
- [x] R1: proxy.ts 검증 — Next 15.5는 `middleware.ts`만 인식, **Next 16에서 `proxy.ts` 공식 지원** (Node 런타임 기본). 마이그레이션 절차: `next@latest` 설치 → `npx @next/codemod@canary middleware-to-proxy .`
- [x] R2: 해외 UX 리서치 — Vercel(Geist, 모노크롬+그라디언트), Linear(optimistic UI, 4px 그리드), Stripe(블루 틴트 섀도), OpenAI(오로라/shimmer), Perplexity(스테이지 상태), Raycast(ease-out-expo), Framer(fade-up 0.4-0.6s), Apple(Liquid Glass) — 스켈레톤/선로딩/버퍼드 스트리밍 등 15-20개 패턴 수집
- [x] R3: 국내 커리어 UX — 원티드(단일 블루 #0066FF, 12px radius), 점핏(0px radius), 잡플래닛(플랫 카드+헤어라인), 커리어리(질문/답변), 랠릿(대시보드) — 단일 액션 컬러, 플랫 카드 패턴
- [x] R4: 디자인 토큰 — Tailwind v4 `@theme` 스니펫, Pretendard/Geist/Suit 폰트 조합, soft shadows, aurora, CSS 변수 다크모드
- [x] C1~C4: 코드 분석 4건 — 글로벌 셸 23건 (토큰 부재/loading.tsx 0개/next/image 0건/다크 모드 라이트 강제/랜딩 흰 배경 충돌/nav 3중 중복/드로어 무애니메이션), 인증·홈·공유 18건 (fetchUser 타임아웃 없음/Mock 체험 프로덕션 노출/에러 화면 데드 코드/ThinkingBubble/CareerAssistantPanel `animate-in` 무효), 핵심기능 1·2 (interview 새로고침 히스토리 소실·종료 UX 없음·stop() 미사용, resume AI 비스트리밍, career 수정 없음·pgvector 실패 가짜 결과, docs WASM 로딩 UX 부족, admin 에러 무시 등)

### 2. 구현 (병렬 8개)
- [x] P0: **Next 16.2.12 업그레이드** (next ^15.1.0→^16.2.12, React 19.2.8 유지) + `middleware-to-proxy` 코어모드로 `src/middleware.ts` → `src/proxy.ts` 전환 (보안 로직 11경로·jose 그대로, Node 런타임) + `next.config.ts` eslint 옵션 제거 + `lint` 스크립트 `next lint`→`tsc --noEmit` (Next 16에서 `next lint` 제거됨)
- [x] P1: globals.css `@theme` 토큰 확장 — `shadow-soft/card/lift`, `animate-fade-in-up`, `animate-shimmer`, `.skeleton` 유틸(shimmer sweep, reduced-motion 대응), `::selection` 병합 / `src/lib/nav.ts` 단일 소스 + Navbar/Sidebar/RootLayoutClient 통합 / 모바일 드로어 (300ms 슬라이드+백드롭+스크롤락+라우트 자동 닫기) / 페이지 전환 `key={pathname}`+fade / `loading.tsx` 스켈레톤 / `error.tsx` 신규 / `Skeleton.tsx` 공통 컴포넌트 / LogoImage sonner toast 전환
- [x] P2: AuthContext fetchUser 10초 타임아웃 + `state.error` 소비 / login·register 개편 (Mock 체험 블록 dev 전용 게이팅, 에러 매핑, 제출 중 disabled, 비밀번호 강도 힌트, shadow-card+그라디언트 배경) / r/[id] 데모 폴백→진짜 에러 화면+미리보기 배지+스켈레톤 / ThinkingBubble indeterminate 진행바+aria / CareerAssistantPanel 무효 `animate-in`→CSS transition+모바일 바텀시트+데모 배지 / 랜딩 데드 코드 제거·배경 그라디언트 정합·푸터 2중 제거·fade-in-up
- [x] P3: useChat `streamStarted`+`status`+`stop()` 실동작 / interview 새로고침 히스토리 복원(localStorage 백업) + 종료 확인 모달+PATCH `completed`+요약 표시 + 생성 중지 버튼 + dots 단일화 / resume 캔버스 스켈레톤·미평가 배지·탭 접근성·제목 디바운스 자동저장 / resume·interview 목록 스켈레톤·빈 상태·카드 hover / **`PATCH /api/interviews/[id]` 신규** (면접 완료 상태 반영)
- [x] P4: ats·qa·humanizer 전면 재작성 — 단계 인디케이터(파싱→분석→산출, 700ms 상태머신)+구조 스켈레톤+ScoreRing SVG 애니메이션+fade-in-up+히스토리(스켈레톤/빈 상태/다시보기/삭제)+인라인 에러+재시도+드래그&드롭+복사 폴백+`role=status`
- [x] P5: **`PUT /api/careers/[id]` 신규** (POST 동일 검증+소유권+임베딩 재생성) / career 목록 가짜 결과 제거(demo- 감지→에러 박스)+검색 3단계 인디케이터+수정 모달+삭제 확인 / **career/[id] 상세 페이지 신규** (유사 경력 추천+similarity%) / studio next/image 전환+드래그&드롭+업로드 오버레이+그리드 개편
- [x] P6: HwpViewer 로딩 영원히 걸리던 버그 수정+문서별 파싱 캐시+단계 시각화+확대/축소 / docs/[id] 미리보기/전체 토글+복사+txt 다운로드 / HwpEditor 로딩 오버레이+10MB 경고 / community 칩 필터+아바타+상대시간+커스텀 삭제 모달+글자수 카운터 / docs 아이콘·토스트 한국어 통일
- [x] P7: settings 알림 토글 localStorage 영속화+role=switch+계정 삭제 "삭제" 텍스트 입력 확인 / admin 에러 토스트+인라인 에러+재시도+careersCount 카드 5종+테이블 개편+새로고침+fade-in-up

### 3. 검증/정리
- [x] `npx tsc --noEmit` 0 / `npm test` **55/55** / `npm run build` 성공 (**Proxy (Middleware) 인식**, 56 정적 페이지)
- [x] AuthContext 다크모드 강제 잔재(`html.classList`) 제거 — CSS에 `.light/.dark` 의존 0건 확인 후
- [x] 잔여 (의도적 유지): QA/Humanizer 삭제 API, 커뮤니티 좋아요 API, admin 사용자 관리 API, avatar 업로드 API는 백엔드 엔드포인트 부재로 미구현 — 향후 확장용
- [x] README 갱신 + 커밋 완료 (push 안 함)

---

## 세션 9: AI 서비스톤 통합 계획서 작성 (2026-08-03)

### 1. 준비
- [x] task.md 맥락 파악 — Kairos = 초개인화 AI커리어 에이전트 플랫폼 (Next.js 16, 서브에이전트 병렬 워크플로우 관례)
- [x] 의존성 확인 — `npm install` up to date (rhwp wasm 복사 정상)
- [x] 기존 심사 문서 2개 파악 — `AI서비스톤_심사기준표_PPT목차.md` (심사 5항목 100점, PPT 8슬라이드), `AI_서비스톤_발표자료양식.md` (10슬라이드, 2026 SW미래채움 × AI·SW중심대학 연합 경진대회)

### 2. 리서치 (병렬 서브에이전트)
- [x] R1: 시장/문제정의 리서치 — ATS 분석법, 국내 취업준비 시장 통계, AI 커리어 서비스 동향 (15회 검색, 수치·출처 포함 보고서)
- [x] R2: 경쟁사/모델 서비스 리서치 — Gespark, Gemini Canvas, Claude, Liner 기능·UX·불만·벤치마킹 포인트 (15회 검색 + 공식 페이지)
- [x] R3: 국내 커리어 플랫폼 리서치 — 잡코리아/사람인/원티드/커리어리/랠릿/잡플래닛 UX·기능 + 6대 갭 분석
- [x] R4: 기술 아키텍처 리서치 — 서브에이전팅, LLM 라우팅(LiteLLM/OpenRouter/RouteLLM), sLLM 파인튜닝(엘리스 클라우드 GPU+QLoRA), 데이터 프로바이더 API(워크넷/고용24/DART/국민연금, LinkedIn·삼성노트 제약), 대법원 2021도1533 판례, Firecracker/E2B 샌드박스 (17회 검색)
- [x] R5: 진로심리/UX 기법 리서치 — 만다라트(9x9, 마쓰무라 야스오), 홀랜드 RIASEC, Super, 커리어-오-그램, 듀오링고 스트릭, 빈캔버스 증후군, Nielsen 휴리스틱, 동병상련 매칭
- [x] R6: 라이선싱/하네스 리서치 — Apache 2.0 이중 라이선싱(SSPL/ELv2/FSL/OpenCore 사례, OLIS·oss.kr), 하네스 엔지니어링, NeMo Guardrails, LLM-as-judge, feature flag 3계층, B2B SaaS(Workday/BetterUp/Lattice) (14회 검색)

### 3. 통합 계획서 작성
- [x] 구성 서브에이전트 — `AI서비스톤_통합계획서.md` 단일 파일 작성 (633줄, # ## 헤딩+《》겹화살괄호, 체크리스트 문법만, 원문 무손실, 이모지 0건)
- [x] 헤딩 《 》 누락 64건 기계 수정 (규칙 "섹션 제목은 겹화살괄호" 준수)
- [x] 카나리 문구 52개 기계 검증 — 원문 특징구절 전부 바이트 단위 보존 확인
- [x] 검증 서브에이전트 — 형식 0위반/구조 60/60/PASS, 심사기준표 15·15·20·40·10=100 확인, 원문 스팟체크 22개 전부 verbatim PASS
- [x] 검증 지적 1건 수정 — §12-1 헤딩 "CAGR 18~22%" → "CAGR 22.3%" 정정
- [x] 최종 확인 + task.md 갱신
- [x] 커밋 완료 (`3d8ee5d`, push 안 함)

---

## 세션 10: 문제 정의·자료조사 섹션 심층 확장 (2026-08-03, 실패)

- [x] 실패 원인: 구성 서브에이전트가 대화 컨텍스트의 원문을 참조할 수 없어 2회 연속 빈 응답 → 원문 파일 영속화 방식으로 **세션 10-B에서 재시도하여 완료** (아래 참조)
- [x] 이 섹션의 미체크 항목(구성/검증/커밋)은 세션 10-B로 이관되어 모두 완료됨

---

## 세션 10-B: 통합 계획서 심층 확장 재시도 + 플레인 txt 산출물 (2026-08-03)

### 0. 준비 (실패 원인 교정)
- [x] 세션 10 구성 실패 원인: 구성 서브에이전트가 대화 컨텍스트의 원문을 참조할 수 없어 빈 응답 → 원문 전체를 `C:\Users\user\AppData\Local\Temp\opencode\kairos\source_original_text.txt`에 파일로 영속화(이후 구성 에이전트가 파일 직접 읽기)
- [x] 의존성 확인 — `npm install` up to date
- [x] git 상태 확인 — clean

### 1. 리서치 재실행 (병렬 서브에이전트 8개, 웹서치 대량 + URL 수집, 리서치 리포트 파일 저장)
- [x] R1: 청년 고용위기·'쉬었음'·구직단념·재취업 번아웃 최신 통계·기사 (2025-2026, 링크 위주) — `Temp\opencode\kairos\research\R1_청년고용_쉬었음.md`
- [x] R2: AI 채용·자소서·면접·AI 탐지 시장 (무하유·사람인·진학사·고용노동부·통계청) — `R2_AI채용_자소서_면접.md`
- [x] R3: ATS 분석·이력서 최적화 (Jobscan, ATS 점유율, 스코어링) — `R3_ATS_이력서.md`
- [x] R4: 국내 커리어 플랫폼 경쟁사 (잡코리아·사람인·원티드·커리어리·랠릿·잡플래닛) — `R4_국내커리어플랫폼.md`
- [x] R5: 글로벌 AI 커리어·라이프코칭 (Teal, BetterUp, Workday Illuminate, LinkedIn) — `R5_글로벌AI커리어.md`
- [x] R6: 진로심리·UX 기법 (만다라트·RIASEC·Super·커리어-오-그램·듀오링고·Nielsen·힉의법칙·동병상련) — `R6_진로심리_UX기법.md`
- [x] R7: 기술 아키텍처 (서브에이전팅·LiteLLM/OpenRouter/RouteLLM·sLLM 엘리스클라우드·하네스 가드레일·이중 라이선싱) — `R7_기술아키텍처.md`
- [x] R8: 공공 데이터·커리어 데이터 트렌드 (워크넷·고용24·DART·국민연금·큐넷·ICQA·랠릿 MY로그) — `R8_공공데이터_커리어관리.md`

### 2. 구성 (병렬 서브에이전트 2개 — 파일 직접 읽기 방식)
- [x] 구성 1: 플레인 txt 파일 생성 — `Kairos_아이디어_심사기준_구상.txt` (아이디어 항목=`-`, 심사기준표·구상=`▷`, 섹션 제목=《》, 원문 무손실)
- [x] 구성 2: `AI서비스톤_통합계획서.md` 심층 확장 — 섹션 3 재구조화(3-1~3-12), '쉬었음' 청년 등 자료조사 강화, 통계·기사 URL 삽입, 기존 원문·통계 라인 무손실 보존, # ##+《》+체크리스트 문법 준수

### 3. 검증
- [x] 검증 — 형식 규칙(`# ` 14·`## ` 83개 전부 《》`, 체크리스트 827줄(633 확정+194 과제), 비체크/비제목 라인 0, 이모지 0, 마크다운 문법(표·인용·이미지·볼드) 0) 수동 전체 판독 + rg 검증 통과
- [x] 원문 무손실 — 원문 블록(V1~V3, 아이디어 1~11, L1~L3, C1~C11, 8슬라이드, PPT 5종, 우선순위) 체크라인 보존 확인, 오타(플렛폼·RHWP·tool_low_edit·Mandarate·수가 사진 임무로 착각해) 보존 확인
- [x] 최종 확인(tsc/test 불필요 — 문서 작업) + task.md 갱신
- [x] 커밋 (push 안 함)

---

## 세션 27: 단일 HTML 임베드·반복 JS 시연 최종화 (2026-08-04)

- [x] 외부 폰트 stylesheet·`@font-face`·외부 이미지 의존 제거
- [x] 실제 Kairos 로고 SVG를 inline symbol로 임베드하고 topbar·표지에서 재사용
- [x] GIF·MP4·PNG 파일 input을 제거하고 제품 흐름 기반 JS 데모로 전환
- [x] ATS·Diff·텍스트 면접 demo 상태를 idle·running·paused·done으로 관리
- [x] 재생·일시정지·다시 재생·반복 컨트롤 및 requestAnimationFrame 구현
- [x] Diff 승인 전 저장 대기, 사용자 적용 후 편집기 반영, 별도 저장 이후 저장 완료 순서 정리
- [x] 면접 답변·plain-text 응답·종료 요약 상태를 실제 코드 흐름에 맞게 정리
- [x] 공식 1~10 및 Appendix 11~14, 문제정의·공익성·전체 제품 비전 유지
- [x] 자체 포함 검사: 외부 폰트 0, 외부 이미지 0, 파일 input 0, inline logo 1, logo use 2, 14장, 이모지 0
- [x] 커밋 (push 안 함)

---

## 세션 26: 발표자료 픽셀 검증 시작 (2026-08-04)

- [ ] 로컬 `발표자료` HTTP 서버 실행
- [x] 로컬 발표 서버 `http://127.0.0.1:4173` HTTP 200 확인
- [x] Orca 런타임 상태와 capabilities 확인
- [ ] 14장 슬라이드 실제 픽셀·가독성·3D·글래스·브랜드 컬러 점검 — 사용자가 컴퓨터 유즈 중단 요청
- [ ] 방향키·Home·End·F·터치 이동 실제 동작 점검 — 사용자가 컴퓨터 유즈 중단 요청
- [x] 발견 문제 수정 후 정적 검사: 14장·브랜드·로고·3D·glass·JS demo·이모지·금지 용어 검사
- [ ] task.md 갱신 및 커밋 (push 안 함)

---

## 세션 25: Kairos 전체 비전 중심 프레젠테이션 재구성 (2026-08-04)

- [x] AI 자소서 서비스가 아닌 삶·경력·맥락 기반 AI 커리어 작업공간으로 서비스 정의 재정렬
- [x] 공식 1~10 발표 순서와 Appendix 11~14 구조 유지
- [x] Context Sea·Career Diary & Growth·Agent Workspace·Preparation Loop 전체 모듈 시각화
- [x] 문제정의: 하루의 경험·기록 소실·첫 취업 지연·AI 문서 불신을 하나의 사용자 여정으로 연결
- [x] 핵심 메시지: 삶의 맥락 → 경험의 기록 → 커리어 판단 → 실행 가능한 작업
- [x] Slide 7을 실제 코드 흐름 기반 ATS·Diff·텍스트 면접 JS 데모로 유지
- [x] 3D orb·ring·gradient·glass panel·brand blue·실제 로고를 통일된 시각언어로 적용
- [x] 공익성 표현을 정보 비대칭·사용자 판단권·기록 기반 준비로 정리하고 성공률 과장 제거
- [x] 14개 section·브랜드·출처·키보드·터치·reduced motion·이모지 검사
- [x] 커밋 (push 안 함)

---

## 세션 24: 공식 발표 순서·제품 시연 애니메이션 최종 정리 (2026-08-04)

- [x] 공식 발표자료 양식 1~10 순서와 Appendix 11~14 순서 확인
- [x] 어색한 내부 문구를 사람 중심 발표 문장으로 교체
- [x] 공익성 표현을 정보 비대칭·사용자 판단권·측정 전 KPI 중심으로 정리
- [x] 실제 제품 범위에 맞춰 ATS·이력서 Diff·텍스트 면접을 핵심 시연으로 고정
- [x] GIF·MP4·PNG 파일 슬롯 제거
- [x] 실제 코드 흐름을 재현하는 `runATSAnimation`, `runDiffAnimation`, `runInterviewAnimation` 구현
- [x] ATS 파싱·키워드 매칭·점수 산출·누락 키워드 시연 상태 구현
- [x] AI 제안·Diff 승인·저장 완료 시연 상태 구현
- [x] 텍스트 답변·plain-text 응답·면접 종료·요약 저장 시연 상태 구현
- [x] 14개 section·브랜드·로고·키보드·터치·reduced motion·이모지 0 검사
- [x] 커밋 (push 안 함)

---

## 세션 23: 계획서 과장·상태 문장 최종 정리 (2026-08-04)

- [x] 커뮤니티 자동매칭·provider adapter·sandbox control-plane 추가 구현 상태를 계획서에 반영
- [x] SLM adapter와 VM control-plane을 실제 실행과 구분하고 endpoint·운영 조건을 명시
- [x] Deep Agent 외부 shell·web-fetch·PPTX/HWPX 자동편집, 화상분석, 상위 5% cohort 판정은 추가 검증 대상으로 명시
- [x] 보안·소유권 보완 완료와 운영 환경 object storage·동의·보존 정책 과제를 구분
- [x] 원문 아이디어 문장은 삭제하지 않고 원문 보존 원칙 유지
- [x] 계획서 형식 검사: 15개 H1, 95개 H2, 체크라인 본문 0위반, 비정상 본문 0개
- [x] 커밋 (push 안 함)

---

## 세션 22: 외부 에이전트·로컬 SLM·안전 Sandbox·블루 3D 발표 확장 (2026-08-04)

### 1. 조사
- [x] Hermes Agent 공식 runtime·API·MCP·A2A·MIT 라이선스·보안 경계 조사
- [x] OpenClaw Gateway·provider·MCP·trusted operator 보안 모델 조사
- [x] OpenCode server·SDK·ACP·MCP·MIT 라이선스·coding task 경계 조사
- [x] Ollama·llama.cpp·Qwen/Phi 모델·QLoRA·Firecracker·Windows Sandbox·OWASP 조사
- [x] Apple·Stripe·Linear·Vercel·Framer·WCAG·눈누 기반 blue/glass/3D/motion 디자인 조사

### 2. 구현
- [x] Gemini·OpenRouter·Ollama/llama.cpp·generic OpenAI-compatible ModelProviderAdapter 구현
- [x] Hermes·OpenClaw·OpenCode ExternalAgentAdapter 구현 및 capability/allowlist/secret 보호
- [x] `/api/providers` provider 상태·capability·health surface 구현
- [x] local SLM endpoint 환경변수·모델 선택·deterministic fallback 구현
- [x] Sandbox control-plane 구현: disabled·remote-firecracker·windows-sandbox 상태, approval·hash·timeout·output/network 제한
- [x] shell·PowerShell·Node·임의 명령 기본 차단, Windows Sandbox는 config 생성·검증만 수행
- [x] 발표자료에 blue token·glass chrome·정적 3D depth·motion·Pexels stock 출처 반영

### 3. 실제 환경 검증
- [x] Ollama `0.32.5` 설치 확인
- [x] 로컬 모델 4개 확인
- [x] `llama3.2:1b` localhost inference 응답 `OK` 확인
- [x] `.env`·API key·provider token git 미추적 유지
- [x] `npm test`: 34개 파일, 188/188 통과
- [x] `npx tsc --noEmit --incremental false` 통과
- [x] `npx drizzle-kit check` 통과
- [x] `npm run build` 성공
- [x] 정적 발표자료 검사 통과
- [x] 커밋 (push 안 함)

---

## 세션 21: 코드 전수 감사·보안 수정·발표자료 재검증 (2026-08-04)

### 1. 코드 감사 및 수정
- [x] 지갑 nonce 검증·재연 방지·연결 해제 흐름 보완
- [x] 신규 workspace·contexts·mentor·messages 페이지 proxy 보호
- [x] MFA 사용자 검증·로그인 흐름 보완
- [x] 사용자별 LLM cache 격리와 refine 응답 shape 정합화
- [x] Gemini embedding 차원과 pgvector schema 정합화
- [x] 가짜 semantic 검색·DB 장애 성공 응답 제거
- [x] 문서·Studio·면접 미디어 업로드 검증 강화
- [x] 비공개 공유 채팅·관리자 설정·내부 오류 노출 보완
- [x] `drizzle/0006_clumsy_lake.sql` 생성 및 로컬 PostgreSQL 최신 migration 적용

### 2. 발표자료 재작업
- [x] 웹 디자인 기법·WCAG·Figma·Fluent·Linear·Stripe chart layout 리서치
- [x] 브랜드 `#2F20F7`, 실제 로고 에셋, 큰 타이포그래피, 비대칭 editorial grid 적용
- [x] 출처 헤드라인 카드·통계 annotation·제품 wireframe·퍼널·아키텍처 레인 추가
- [x] GIF/MP4/PNG 시연 슬롯과 기본 대체 화면 유지
- [x] 14장 구성·키보드·터치·전체화면·reduced motion 유지

### 3. 검증
- [x] `npm test`: 31개 파일, 165/165 통과
- [x] `npx tsc --noEmit --incremental false` 통과
- [x] `npx drizzle-kit check` 통과
- [x] `npm run build` 성공
- [x] `npm run db:migrate` 최신 migration 적용 성공
- [x] `git diff --check` 통과
- [x] 정적 발표자료 14장·브랜드·로고·media input 3개·금지 용어 0 검사
- [x] 커밋 (push 안 함)

---

## 세션 20: 발표자료 디자인 전면 재작업 (2026-08-04)

- [x] 사용자의 공식 브랜드 컬러 `#2F20F7` 확인 및 발표자료 1차 컬러 전환
- [x] 디자인 혹평 기준으로 작은 글자·카드 과밀·장식성 그라디언트·placeholder 중심 구조 재설계
- [x] 눈누·WCAG·프로젝터 타이포그래피·editorial data storytelling 리서치 반영
- [x] 실제 `kairoslogo_basic자산 5.svg` 로고 사용 유지
- [x] 통계청·국가데이터처·동아일보·무하유·지디넷코리아 출처 헤드라인 카드 추가
- [x] 문제정의·공익성·경쟁 차별성·제품 증거·기능 전체 맵·Q&A를 편집형 그래픽으로 재배치
- [x] 본문 최소 24px, 제목 최소 48px 수준의 `clamp()` 타이포그래피 적용
- [x] GIF·MP4·PNG 3개 시연 슬롯과 기본 wireframe 대체 화면 유지
- [x] 정적 검사: 14장, `#2F20F7`, 로고 경로, source card 3개, media input 3개, SLLM·VM·Firecracker·E2B 0, 이모지 0
- [x] 커밋 (push 안 함)

---

## 세션 19: 브랜드 에셋·컬러 최종 적용 (2026-08-04)

- [x] `ASSETS/kairoslogo_basic자산 5.svg`, white logo, brandcopy, 배경 SVG, identity PDF 존재 확인
- [x] 발표자료 상단·표지에 실제 `kairoslogo_basic자산 5.svg` 연결
- [x] 로고 공식 포인트 컬러 `#B2E9FF`를 발표자료 주 강조색으로 적용
- [x] 눈누 기반 프리젠테이션 폰트와 SUIT·Pretendard·맑은 고딕 fallback 유지
- [x] 14장·GIF 슬롯·키보드·16:9·HTML 종료 검사 재통과
- [x] 커밋 (push 안 함)

---

## 세션 18: 심사위원 관점 고급 발표자료 전면 교체 (2026-08-04)

- [x] 눈누·폰트 라이선스·WCAG 대비·16:9 프로젝터·편집적 데이터 시각화 리서치 반영
- [x] 기존 루트 `발표자료/index.html`을 14장 독립 정적 발표자료로 교체
- [x] 공식 10슬라이드와 Appendix 4장 구성
- [x] 문제정의·공익성·경쟁 차별성·전체 기능 맵·실제 코드 증거·Q&A 시각화
- [x] GIF·MP4·PNG 3개를 브라우저에서 임시 미리보기할 수 있는 대체 시연 슬롯 구현
- [x] SUIT·프리젠테이션 계열 폰트와 로컬 fallback, 다크 네이비·시안·라임 시각 언어 적용
- [x] 방향키·PageUp/PageDown·Home·End·F 전체화면·클릭·터치 조작 구현
- [x] SLLM·VM·Firecracker·E2B·이모지 0건 확인
- [x] HTML 14개 section·16:9·출처 URL·JavaScript·`</html>` 검사 통과
- [x] Orca 브라우저 런타임 미연결로 실제 픽셀 검증은 수행하지 못함
- [x] 커밋 (push 안 함)

---

## 세션 15: 전체 아이디어 구현·로컬 PostgreSQL·발표 고도화 (2026-08-03)

### 1. 범위 결정
- [x] SLLM 파인튜닝과 VM 인스턴스 할당은 구현·발표·계획서 범위에서 제외한다
- [x] 나머지 원문 아이디어는 실제 구현·실행 가능한 MVP·명시적 로드맵으로 분류했다
- [x] `.env`와 실제 비밀값은 git 추적하지 않는다

### 2. 병렬 구현
- [x] 로컬 PostgreSQL 서비스 실행·DATABASE_URL 연결·Drizzle 마이그레이션
- [x] Deep Agent Canvas MVP: 도구 상태·Markdown retry·버전·Diff 편집
- [x] Career Community 동병상련 자동매칭, 경력 일기·직무 매칭·진로기법 MVP를 구현했다
- [x] Sea of Contexts의 파일 import/export·공식 API 커넥터 상태 MVP를 구현했다
- [x] 취업준비생 메시지·톤교정·멘토 로드맵·성장 데이터 MVP
- [x] AI 라우팅·서브에이전팅·하네스 MVP
- [x] 심사기준 근거자료·출처·시각화 발표자료를 실제 구현 범위에 맞춰 고도화했다

### 3. 통합 검증
- [x] PostgreSQL clean migration 성공 및 핵심 API 통합 테스트 실행
- [x] 계획서에서 SLLM·VM 범위를 범위 제외로 갱신하고 실제 구현 목록을 정리했다
- [x] 발표자료에서 근거자료·시각화·실제 데모 범위를 갱신했다
- [x] 전체 테스트·빌드·task.md 갱신: `npm test` 29개 파일, 161/161 통과, TypeScript·Drizzle check·build 통과
- [x] 커뮤니티 익명·활동점수·체크인 미션, 영상 면접 미디어 MVP, 이력서 비교 MVP, 로컬 공공 API 동기화 MVP를 추가했다
- [x] 라이선스 산출물 `LICENSE`, `NOTICE`, `LICENSING.md`를 추가했다
- [x] `.env`는 gitignore 상태로 유지하고 `.env.example`에는 placeholder만 유지했다
- [x] 커밋 전 상태 확인 완료 (push 안 함)

---

## 세션 10-D: R9 문제정의 리서치 계획서 통합 (2026-08-03)

- [x] R9 신규 문제정의 리서치 30개 사실을 통합 계획서에 반영
- [x] 반영 섹션: 3-1, 3-5, 3-6, 3-7, 3-8, 3-9, 4-2, 4-3, 4-4, 12-2
- [x] R9 출처 URL 포함 및 계획서 체크리스트 형식 유지 확인
- [x] 기존 원문 보존 및 R9 원문 파일 미수정 확인
- [x] 커밋 (push 안 함)

---

## 세션 10-C: 계획서 재검증·문제정의 신규 리서치 (2026-08-03)

- [x] 의존성 확인 — `npm install` 정상 완료, git 작업트리 확인
- [x] 계획서 검증 서브에이전트 재실행 — 형식 PASS: 총 1011줄, `#` 14개, `##` 83개, `- [x]` 640개, `- [ ]` 194개, 비제목·비체크 라인 0, 이모지 0
- [x] 원문 무손실 핵심 표현 14종 발견 확인 — 플렛폼, 공식젃으로, playwirght, RHWP, Mandarate, tool_low_edit, 수가 사진 임무로 착각해, 복붙이, 꾸역꾸역, 대나무숲, 커피 쿠폰 권, 제뉴스, 런 웨, 쉬었음
- [x] 계획서 원문 보수 — 누락된 원문 문장·공백·취업 준비생 전형 표기를 체크라인으로 복원
- [x] 문제정의 신규 리서치 서브에이전트 재실행 — 7개 주제, 49개 사실 항목, 출처 URL 수집
- [x] 신규 리서치 파일 생성 — `C:\Users\user\AppData\Local\Temp\opencode\kairos\research\R9_신규_문제정의_보강.md`
- [x] 이번 재실행 범위에서는 신규 R9를 계획서에 통합하지 않음 — 별도 통합 작업으로 분리
- [x] 커밋 (push 안 함)

---

## 세션 11: 구현 상태·발표 기준·R9 보강 정합화 (2026-08-03)

### 1. 작업 범위
- [x] `AI서비스톤_통합계획서.md`와 `task.md`만 직접 수정
- [x] 원문 보존 상태를 유지하고 섹션 8·10·11에 실제 구현 완료, 프로토타입·데모 준비, 설계·로드맵 상태를 코드 경로와 함께 분리
- [x] 기술구현 40점 대응을 기능 수가 아닌 엔드투엔드 시연, 테스트, 오류 대체경로, 보안·소유권 기준으로 재정리
- [x] 공식 10슬라이드와 원문 8슬라이드의 관계 및 최종 10슬라이드 통합 원칙 추가
- [x] 발표 숫자 단일 기준 세트와 모집단·기준시점·출처·사용 금지 원칙 추가
- [x] 페르소나 3종, Pain 3개, KPI 3개, 예상 질문·답변 카드, 실제 데모 3종 실행 과제 추가
- [x] R9의 경력단절·LinkedIn 조사방법·진로심리·BetterUp 보강 사실과 URL 추가

### 2. 구현 상태 대조
- [x] 실제 구현 완료로 문서화한 범위: ATS 결정론적 분석, 이력서 AI 개선·Diff 승인, 텍스트 면접 plain-text 스트리밍, QA/Humanizer, Career CRUD·검색, HWP/HWPX 뷰어·에디터, 기본 커뮤니티 게시·조회·본인 글 삭제
- [x] 설계·로드맵으로 분리한 범위: Deep Agent Canvas 전체, 툴 호출, 외부 provider connector, 서브에이전트, 자동매칭, 화상면접, 3개월 멘토 성장판정
- [x] 범위 제외로 확정한 항목: SLLM 파인튜닝과 VM 인스턴스 할당

### 3. 검증
- [x] 계획서 형식 검사: `#` 14개, `##` 87개, 체크라인 934개, 비제목·비체크 비공백 라인 0개
- [x] 계획서 금지 형식 검사: 표, 인용 블록, 볼드·밑줄, 일반 불릿, 이모지 0개
- [x] 원문 핵심 표현 14종 검사: 플렛폼, 공식젃으로, playwirght, RHWP, Mandarate, tool_low_edit, 수가 사진 임무로 착각해, 복붙이, 꾸역꾸역, 대나무숲, 커피 쿠폰 권, 제뉴스, 런 웨, 쉬었음 모두 확인
- [x] `npm test`: 7개 파일, 55/55 통과
- [x] `npm run lint` 실행 결과 확인: 직접 수정하지 않은 `src/app/api/admin/settings/update/route.ts`의 `admin` 미정의 오류로 실패
- [x] 이번 세션은 커밋 요청이 없어 커밋·push를 수행하지 않음

---

## 세션 12: 최종 구현·발표·R9 정합화 보완 (2026-08-03)

### 1. 작업 범위
- [x] `AI서비스톤_통합계획서.md`와 `task.md`만 수정한다
- [x] 클라이언트 반환 스트림을 plain-text로 명시하고 내부 Gemini SSE 파싱과 구분한다
- [x] ATS의 실제 결정론적 휴리스틱 범위가 어조 분석이 아님을 명시한다
- [x] 실제 구현 완료, 프로토타입·데모 준비, 설계·로드맵 범위를 코드·발표자료 기준으로 재확인한다
- [x] 보안·소유권, mock 모드, 실제 환경변수 의존성과 제한을 구현 범위에 반영한다
- [x] 발표용 canonical 숫자 규칙, 예선 5분 시간 배분, 실제 데모 3개를 명시한다
- [x] R9 유용 사실과 R9 URL 모음을 계획서에 추가하고 R1~R9 범위를 명시한다

### 2. 완료 조건
- [x] 계획서 형식 검사 결과: `#` 14개, `##` 89개, 체크라인 970개, 비제목·비체크 비공백 라인 0개
- [x] 계획서 금지 형식 검사 결과: 표, 인용 블록, 볼드·밑줄, 일반 불릿, 이모지 0개
- [x] 원문 아이디어·심사기준·PPT 원문은 삭제·의역·정정하지 않고 보존 상태를 확인했다
- [x] `git diff --check` 통과, tsc·test·build는 실행하지 않았다
- [x] 이번 세션은 커밋·push를 수행하지 않았다

---

## 세션 13: R9 URL 모음·발표 기준 최종 검증 (2026-08-03)

### 1. 작업 범위
- [x] `AI서비스톤_통합계획서.md`와 `task.md`만 수정
- [x] 기존 원문 문장은 삭제·변경하지 않고 R9 URL 모음과 검증 기록만 추가·복원
- [x] 기존 R9 통합 사실에서 사용된 고유 URL 23개가 `## 《13-9. R9 신규 문제정의 보강 출처 URL 모음》` 아래 체크라인으로 수록된 것을 확인
- [x] 예선 5분 시간 배분과 실제 데모 3개가 계획서에 명시된 것을 확인
- [x] 실제 구현·프로토타입·로드맵 상태 구분과 공식 10슬라이드 기준이 유지된 것을 확인

### 2. 검증
- [x] 계획서 형식 검사: `#` 14개, `##` 89개, 체크라인 970개, 비제목·비체크 비공백 라인 0개
- [x] 계획서 금지 형식 검사: 표, 인용 블록, 볼드·밑줄, 일반 불릿, 이미지, 이모지 0개
- [x] 원문 canary 14종 전부 확인
- [x] R9 통합 사실 URL 집합과 13-9 URL 체크라인 집합이 23개로 일치
- [x] `git diff --check` 통과

---

## 세션 14: 심사위원 기준 전체 구현·발표·보안 보완 (2026-08-03)

### 1. 병렬 감사
- [x] 심사위원·제3자·팀원 관점으로 계획서·코드·발표자료 대조
- [x] 실제 구현 범위와 계획·로드맵 범위를 분리하고 과장·통계 충돌·발표 불일치 점검
- [x] 공식 10슬라이드 순서·5분 발표·Q&A 요구사항 점검

### 2. 실제 코드 구현
- [x] 면접 생성 응답·초기 질문·메시지 저장·종료 상태 계약 정합화
- [x] mock URL ID 파싱, QA/Humanizer/Career/Interview 응답 shape와 IndexedDB 문서 store 정합화
- [x] 개발·mock 세션 쿠키를 안전하게 연결하고 프로덕션 인증 우회 방지
- [x] LLM·QA·Humanizer·Career·Company·Resume·Interview·Studio·Storage 보호 API 인증 강화
- [x] 문서·이력서·면접·Studio 파일 소유권 검사와 관리자 role 검증 추가
- [x] 업로드 MIME·확장자·용량·파일 signature 검증과 DB 장애 fail-closed 처리
- [x] `drizzle/0002_security_access_control.sql`과 schema 정합화, 보안 테스트 추가
- [x] 사용자 요구사항에 맞춰 `src` 전체 UI 이모지 제거

### 3. 발표·문서 산출물
- [x] 공식 10슬라이드 발표 웹페이지를 실제 구현 범위 중심으로 재작성
- [x] 발표 렌더링·모바일·내부 스크롤·5단계 흐름 레이아웃 오류 수정
- [x] 실제 캡처와 정적 설명을 구분하고 mock·실제 AI·녹화본 대체 경로를 명시
- [x] `AI서비스톤_발표대본_5분.md` 작성 — 5분 본문, 90초 데모, Q&A 방어 카드 8개
- [x] 계획서에 실제 구현·프로토타입·로드맵 구분, R9 URL 23개, canonical 통계와 발표 기준 반영

### 4. 최종 검증
- [x] `npm install` 정상 완료
- [x] `npm test` — 12개 파일, 82/82 통과
- [x] `npx tsc --noEmit --incremental false` 통과
- [x] `npm run build` 성공
- [x] `npx drizzle-kit check` 통과
- [x] `git diff --check` 통과
- [x] 앱 소스 이모지 0개 확인
- [x] 커밋 (push 안 함)

---

## 세션 16: 환경변수 템플릿·로컬 PostgreSQL 안내 정리 (2026-08-03)

### 1. 작업 범위
- [x] 코드 grep 결과 기준으로 필수 환경변수 4개와 실제 코드에서 읽는 선택 환경변수만 `.env.example`에 반영
- [x] `.env.example`의 PostgreSQL URL을 placeholder로만 구성하고 실제 비밀번호·API key·token을 포함하지 않음
- [x] README에 로컬 PostgreSQL·`pgvector` 준비와 `npm run db:migrate` 실행 절차를 간단히 기록
- [x] SLLM·VM 환경변수는 추가하지 않음

### 2. 검증
- [x] `.env`와 `.env.local`이 `.gitignore` 대상이고 `.env.example`만 예외인 것을 확인
- [x] `git diff --check` 및 허용 파일 diff의 secret 패턴 검사
- [x] `.env.example`, `README.md`, `task.md` 외 소스·계획서는 수정하지 않음

---

## 세션 17: 루트 정적 발표자료 제작 (2026-08-03)

- [x] 루트 `발표자료` 폴더 생성
- [x] `발표자료/index.html` 단일 파일에 공식 10슬라이드 구성
- [x] 16:9 발표 화면·반응형 축소·프로젝터용 가독성 적용
- [x] ArrowRight·ArrowLeft·PageUp·PageDown·Home·End·F 전체화면 조작 구현
- [x] 마우스 클릭·터치 좌우 이동 구현
- [x] 문제정의 통계·모집단·기준시점·출처 시각화
- [x] ATS·이력서 Diff·텍스트 면접 흐름과 실제 아키텍처 시각화
- [x] 이모지·외부 라이브러리·외부 폰트 없이 단독 실행 확인
- [x] `</html>` 종료·10개 슬라이드·출처 URL·JavaScript 문법 검사
- [x] 커밋 (push 안 함)

---

## 세션 22: 현재 코드·외부 adapter·발표 문서 정합화 (2026-08-04)

### 1. 문서 작업 범위
- [x] 사용자 지정 문서 `README.md`, `AI서비스톤_통합계획서.md`, `AI서비스톤_발표대본_5분.md`, `task.md`만 직접 수정
- [x] 기존 계획서 원문 아이디어·심사기준·PPT 원문을 삭제하거나 의역하지 않고 최신 기준 섹션을 추가
- [x] 병행 반영된 `src/server/providers/`, `src/server/sandbox/`, `providerConfig.ts`를 읽고 문서의 SLLM·VM·external agent runtime 범위를 실제 코드에 맞춰 갱신

### 2. 코드 기준 수치
- [x] `db/schema.ts`의 `pgTable` 정의 **44개** 확인
- [x] `src/app/api/**/route.ts` **107개** 확인
- [x] `src/app/**/page.tsx` **28개** 확인
- [x] `test/**/*.test.ts` **34개 파일**, **186개 테스트** 확인
- [x] `src/server/providers`의 model/external-agent adapter와 `src/server/sandbox`의 disabled·remote-firecracker·windows-sandbox 상태를 문서화

### 3. SLLM·VM·외부 runtime 범위
- [x] SLLM/SLM은 Ollama·llama.cpp 및 OpenAI-compatible model adapter의 text·structured·stream·health 범위로 기록하고 파인튜닝·GPU provisioning을 결과로 주장하지 않음
- [x] VM은 Linux remote Firecracker job adapter와 Windows Sandbox config-only 경계로 기록하고, endpoint·token이 없으면 disabled로 기록
- [x] Hermes·OpenClaw·OpenCode를 `kind: external-agent`로 구분하고 공식 URL·MIT 라이선스·allowlist·승인·격리·출력 검증 경계를 기록
- [ ] 실제 remote endpoint health·submit·cancel·output 운영 검증과 외부 runtime 리허설을 수행

### 4. 발표 자료 정합화
- [x] 심사기준 15·15·20·40·10 합계 100점 기록
- [x] 공식 10장 순서와 루트 14장 정적 덱, Q&A 11/14, Appendix 12/14~14/14의 차이 기록
- [x] ATS·Diff 승인·텍스트 면접 GIF·MP4·PNG 슬롯 3개와 파일 부재 시 구조화 mock 경로 기록
- [x] `#2F20F7`, blue glass, CSS 3D, motion, stock image 부재, 폰트·브랜드·미디어 출처와 라이선스 경계 기록
- [ ] 최종 제출 전 정적 덱 DOM을 공식 10장 순서와 대응시키고 실제 GIF 파일 출처·라이선스를 등록

### 5. 검증
- [x] `npm test` — **34개 파일, 186/186 통과**
- [x] `git diff --check` 통과
- [x] 계획서 형식 검증에서 `#`·`##` 제목, `《》`, 체크리스트 본문, 이모지 금지와 금지 마크다운 문법을 재확인
- [x] 사용자가 병행 작업 중인 코드·환경변수·발표자료 변경은 되돌리거나 수정하지 않음
- [x] 이번 세션에서 직접 수정한 파일은 문서뿐이며 병행 작업의 코드·환경변수·발표자료 변경은 그대로 두고 커밋·push를 수행하지 않음

## 세션 28: Context·Career·Workspace 실제 시연 경로 보완 (2026-08-05)

### 1. 구현 범위
- [x] Context Sea에 Notion·GitHub 공식 API adapter를 추가하고 서버 환경변수·timeout·응답 크기·원문 비저장 경계를 적용
- [x] Context provider 타입에 큐넷을 포함하고 Context sync가 private provider와 public provider를 같은 소유권·동의 흐름으로 처리하도록 정합화
- [x] `testmockup` Mock interceptor에 Context provider·item import·검색·삭제·export, Community 게시글·매칭·reputation·check-in 요청 경로를 추가
- [x] Mock interceptor를 AuthContext에서 동기 설치해 새로고침 직후 첫 API 요청이 실제 401/503으로 빠지지 않도록 수정
- [x] Career Diary·Career goals·Career matches와 Agent Workspace Mock localStorage를 사용자별 key로 분리하고 Mock logout 시 저장소 family를 정리
- [x] Agent Workspace가 URL의 `?workspace=` 선택값을 새로고침 후 복원하도록 수정
- [x] Community 게시글 수정 API와 UI를 추가해 생성·조회·수정·삭제 흐름을 완성
- [x] ATS 한글 학력·경력 보존, 영어 짧은 기술명 부분문자열 오탐 방지, 이력서 Diff 재진입 복원 수정
- [x] career-goals 동적 route segment 이름 충돌(`[id]`·`[goalId]`)을 `[id]`로 통일해 production start 500을 해결
- [x] README·`.env.example`·수정본 발표자료의 현재 기능·공식 API·테스트 수·상태 설명을 갱신

### 2. 검증
- [x] `npm test` — **35개 파일, 193/193 통과**
- [x] `npx tsc --noEmit --incremental false` 통과
- [x] `npx drizzle-kit check` 통과
- [x] `npm run build` 통과
- [x] `next start --hostname 127.0.0.1 --port 3003` production 기동 및 `/auth/login` HTTP 200 확인
- [x] Dev Mock smoke test — 새로고침 후 `/contexts` seed provider·item, `/community` 게시글·유사도 match, Context import·export, Community PATCH 확인
- [x] 발표자료 JavaScript 문법·14장 slide·상대경로 media import 0·팀 정보·chart hook 정적 검사 통과
- [x] `git diff --check` 통과
