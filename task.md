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
