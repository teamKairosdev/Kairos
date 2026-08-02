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
