# ️ Kairos AI Platform 개발 실행 태스크 (task.md)

##  Phase 1: D-2 예선(7/31) 긴급 시연 & 프로덕션 10대 갭 1차 해결
- [x] **1.1 `llmCache` Nitro Alias 설정 추가 (`nuxt.config.ts`)**
- [x] **1.2 `setCachedResponse` 캐시 쓰기 로직 복구 (`server/api/llm/refine.post.ts`)**
- [x] **1.3 `vercel.json` 내 레거시 Rewrite 규칙 정리**
- [x] **1.4 UI 에러 처리 개선 (`alert()` → Nuxt UI `useToast()`)**
  - [x] `app/pages/resume/[id].vue`
  - [x] `app/pages/interview/[id].vue`
  - [x] `app/pages/ats/index.vue`
  - [x] `app/pages/qa/index.vue`
  - [x] `app/pages/career/index.vue`
  - [x] `app/pages/humanizer/index.vue`
- [x] **1.5 미사용 임포트 정리 및 `.env.example` 누락 변수 보완**
- [x] **1.6 Neon pgvector 데모 샘플 데이터 구성 및 시연 백업 테스트**
- [x] **1.7 빌드 및 런타임 검증 (`npm run build`)**

##  Phase 2: D-10 본선(8/8) 대응 — 프론트엔드 하이브리드 & AI SDK v7 에이전트 고도화
- [x] **2.1 Astro Islands 정적 피드 분리 (`r/*` ISR 캐싱 룰 적용)**
- [x] **2.2 Nuxt 4 SPA 모드 CUI Thinking Process Bubble UI 구축 (`CareerAssistantPanel`, `ThinkingBubble`)**
- [x] **2.3 Vercel AI SDK v7 5대 에이전트 파이프라인 (Evaluator-Optimizer, ReAct)**
- [x] **2.4 Layer 1-4 Guardrail Engine 적용 (`server/services/guardrail.ts`)**

##  Phase 3: B2B2C 채용 인텔리전스 & 커뮤니티 & MCP 연동
- [x] **3.1 잡코리아 x 사람인 x Reddit 메타 분석 파이프라인 (`companyMeta.ts`, `server/api/company/meta.post.ts`)**
- [x] **3.2 워크넷/고용24 공공 MCP 커넥터 구현 (`server/services/mcp.ts`, `server/api/mcp/manifest.get.ts`)**

##  Phase 4: 멀티플랫폼 모노레포 구축 (Tauri v2, Expo, Extension, CLI)
- [x] **4.1 Tauri v2 Desktop 앱 HWP/HWPX 로컬 파서 바인딩 (`packages/tauri-bridge/index.ts`)**
- [x] **4.2 React Native Expo 모바일 앱 디바이스 STT/TTS 연동 (`packages/mobile-bridge/index.ts`)**
- [x] **4.3 Chrome Extension & VS Code Extension 개발 (Manifest V3 & VSX Bridge)**
- [x] **4.4 Agent CLI 구현 (`packages/agent-cli/index.ts`)**

## ️ Phase 5: 공익성 데이터 서비스 & 자동마진장치 / Web3 결제
- [x] **5.1 대학/지자체 스킬 갭 대시보드 API (`publicSkillGap.ts`, `server/api/public/skill-gap.get.ts`)**
- [x] **5.2 Upstash Redis Semantic Cache & 비용 자동마진장치 (`marginControl.ts`)**
- [x] **5.3 Polygon Solidity Web3 결제 스마트 컨트랙트 (`contracts/KairosSubscription.sol`)**

##  Phase 6: 독점 커리어 OS 생태계 완성
- [x] **6.1 커리어 경로 및 연봉 상승 예측 RAG 엔진 (pgvector 1536-dim HNSW)**
- [x] **6.2 i18n 다국어 및 WCAG AA 접근성 검증 (PWA / Offline Queue)**
