# Kairos (카이로스) 커리어 관리 플랫폼 마스터 기획서

> **문서 버전**: 2.0 (통합 단일 마스터 기획서)  
> **최종 수정일**: 2026-07-30  
> **문서 목적**: 파편화된 기존 기획 문서를 단일화하고, 실제 기술 스택 및 기능 명세를 명확히 정의함.

---

## 1. 프로젝트 개요 (Project Overview)

Kairos는 사용자의 커리어 이력 관리, 이력서 첨삭, 맞춤형 AI 모의 면접, ATS(채용 관리 시스템) 채용공고 분석 기능을 통합 제공하는 **웹 기반 커리어 관리 플랫폼**입니다.

### 1.1 핵심 목표
- **이력서 최적화**: 구직자의 이력서를 분석하여 직무 적합도를 높이고 문맥을 교정합니다.
- **실전 면접 준비**: 직무 및 난이도별 질문을 생성하고 실시간 스트리밍 대화를 통해 모의 면접을 제공합니다.
- **경력 데이터 자산화**: 경력 이력을 시맨틱 벡터로 변환하여 필요할 때 직무에 맞춰 추출·활용합니다.
- **안정적 관리자 운용**: 관리자 전용 CMS를 통해 사용자 및 서비스 데이터를 체계적으로 운용합니다.

---

## 2. 시스템 아키텍처 (System Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                   Web Client (Nuxt 4 SPA)                   │
│  - Vue 3 + TypeScript                                       │
│  - Tailwind CSS v4 + SEED Design System                     │
│  - PDF/DOCX/HWP Browser Parser (pdfjs, mammoth, hwplib)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / SSE
┌──────────────────────────────▼──────────────────────────────┐
│                Nitro Server Engine (Nuxt 4)                 │
│                                                             │
│  ┌──────────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │ Auth Engine      │  │ LLM Router     │  │ Storage     │ │
│  │ (GCP OAuth + JWT)│  │ (Gemini / Gate)│  │ (Vercel Blob│ │
│  └──────────────────┘  └────────────────┘  └─────────────┘ │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│ Database & Vector Search    ││ Payload CMS (Admin Interface) │
│ - NeonDB (PostgreSQL)       ││ - Collection Management      │
│ - pgvector (1536-dim HNSW)  ││ - User & Content Control     │
│ - Drizzle ORM               ││ - NeonDB Postgres Adapter    │
└─────────────────────────────┘└──────────────────────────────┘
```

### 2.1 기술 스택 정의

| 구분 | 기술 스택 | 비고 |
|---|---|---|
| **Frontend Framework** | Nuxt 4 (SPA mode) + Vue 3 | 클라이언트 사이드 렌더링 중심 |
| **Styling System** | Tailwind CSS v4 + SEED Design | 일관된 라이트 모드 UI 제공 |
| **Backend Engine** | Nuxt Nitro Server API Routes | Node.js 서버리스 환경 지원 |
| **Database** | NeonDB (PostgreSQL) + pgvector | 1536차원 벡터 임베딩 지원 |
| **ORM** | Drizzle ORM (v0.45+) | 타입 안전성 및 스키마 관리 |
| **Authentication** | GCP OAuth 2.0 + JWT (`jose`) | HTTP-Only 세션 쿠키 제어 |
| **LLM Provider** | Google Gemini (`gemini-2.0-flash-001`) | 직접 연결 모듈 구성 |
| **AI Router** | Vercel AI Gateway 지원 | 게이트웨이 통한 다중 모델 라우팅 |
| **File Storage** | Vercel Blob Storage | 이력서/첨부파일 공용 저장소 |
| **Admin System** | Payload CMS 3.x | NeonDB 연동 데이터 관리자 페이지 |

---

## 3. 주요 기능 명세 (Core Features)

### 3.1 이력서 관리 및 첨삭 (Resume Studio)
- **문서 파싱**: PDF, DOCX, HWP/HWPX 문서의 텍스트를 브라우저 단에서 직접 추출.
- **3단계 첨삭 파이프라인**:
  1. `Draft`: 원본 이력서 구조 분석 및 초안 정리.
  2. `Evaluate`: 강점, 약점, 영향력 점수 산출 및 개선 가이드 생성.
  3. `Improve`: 직무 명확성과 전달력을 높인 최종 수정본 생성.
- **저장 및 다운로드**: Vercel Blob Storage에 원본과 결과물 보관.

### 3.2 AI 모의 면접 (Mock Interview Chamber)
- **세션 생성**: 직종(개발, 디자인, PM 등) 및 난이도(신입, 경력) 설정.
- **실시간 대화**: SSE(Server-Sent Events) 스트리밍 방식을 통한 실시간 면접 진행.
- **답변 평가**: 면접 종료 후 전체 점수, 질문별 답변 분석, 개선 팁 제공.

### 3.3 ATS 채용공고 매칭 (ATS Optimization)
- **공고 분석**: 채용공고(JD) 텍스트 입력 시 필요 역량 및 주요 키워드 추출.
- **적합도 산출**: 이력서와 JD 간 매칭 스코어 계산.
- **키워드 가이드**: 보유 키워드 vs 누락 키워드를 분류하여 보완점 제안.

### 3.4 커리어 시맨틱 지식베이스 (Career KB & Vector Search)
- **경력 등록**: 프로젝트 성과, 담당 역할, 기간, 기술 스택 등록.
- **임베딩 생성**: 경력 항목을 1536차원 벡터로 변환하여 저장.
- **유사도 검색**: 지원하려는 직무 문맥과 가장 관련성이 높은 과거 경력 추출.

### 3.5 문장 휴머나이저 (AI Text Humanizer)
- AI 특유의 정형화된 어조나 어색한 문장 구조를 자연스러운 한국어 스타일로 정제.

### 3.6 관리자 시스템 (Payload CMS Admin)
- `/admin` 경로를 통한 서비스 데이터 관리.
- 유저 목록, 이력서 등록 현황, 커리어 지식베이스 데이터 관리 및 권한 제어.

---

## 4. 데이터베이스 스키마 구조 (Database Schema)

### 4.1 핵심 엔티티
1. `users`: 유저 식별자, 이메일, 이름, 아바타, google_id, wallet_address.
2. `resumes`: 이력서 제목, 원본 텍스트, 파싱 텍스트, 현재 점수, 상태.
3. `resume_refinements`: 이력서 첨삭 단계별 내용 및 평가 피드백 JSON.
4. `mock_interviews`: 모의 면접 세션(직무, 난이도, 종합 점수, 총평).
5. `interview_messages`: 면접 질문/답변 기록 및 답변별 피드백 JSON.
6. `ats_analyses`: ATS 분석 결과(매칭 점수, 매칭/누락 키워드 JSON).
7. `careers`: 경력 항목 및 pgvector 1536차원 임베딩 데이터.
8. `company_meta`: 기업별 평판, 문화 스코어, 장단점 요약 데이터.
9. `chat_sessions`: AI 대화 세션 기록.

---

## 5. 실행 로드맵 (Execution Roadmap)

### Phase 1: 코어 아키텍처 및 시스템 전환 (완료)
- [x] Better Auth 제거 후 GCP OAuth2 + JWT 연동
- [x] Google Gemini API 직접 연결 모듈 구축
- [x] Vercel AI Gateway 다중 라우팅 파이프라인 구성
- [x] Vercel Blob Storage 및 업로드 API 연동
- [x] Payload CMS 관리자 설정 (`payload.config.ts`)
- [x] 기존 불일치 문서 아카이빙 처리 (`docs/archive/`)

### Phase 2: 서비스 기능 고도화 및 안정화 (차기 단계)
- [ ] Payload CMS 관리자 UI 커스텀 구성 및 접근 권한 설정
- [ ] 이력서 파일 파서(HWP, PDF) 브라우저 예외 처리 강화
- [ ] 모의 면접 SSE 스트리밍 에러 핸들링 및 재연결 로직 보완
- [ ] ATS 매칭 알고리즘 정교화 및 결과 UI 가독성 개선

### Phase 3: 품질 검증 및 배포
- [ ] 주요 API 경로 대상 Vitest 단위 테스트 및 통합 테스트 작성
- [ ] Vercel Serverless + NeonDB 프로덕션 환경 환경변수 검증 및 배포
