# Kairos Modernization Plan (모던화 구현 계획서)

> **목표**: 기존 Nuxt 3 SSR 모노리스를 **SPA + Serverless + 클라이언트 사이드 AI** 아키텍처로 전면 전환
> **작성일**: 2026-07-28
> **기반**: 3개 리서치 에이전트 전방위 웹서치 + 기존 55개 소스 파일 분석

---

## 0. 핵심 아키텍처 비전

### 현재 구조 (2024)
```
[브라우저] ←→ [Nuxt 3 SSR 서버 (Vercel Serverless)]
                     ├── server/api/* (API 라우트)
                     ├── server/services/* (LLM 호출 + DB)
                     ├── db/* (Drizzle ORM → PostgreSQL)
                     └── 모든 연산 서버 사이드
```

### 목표 구조 (2026)
```
┌─────────────────────────────────────────────────────────┐
│                    브라우저 (SPA)                         │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ PDF/DOCX    │  │ 임베딩 생성   │  │ ATS 점수 계산   │ │
│  │ 파싱        │  │ (transformers │  │ (키워드 매칭)   │ │
│  │ (pdf.js +   │  │  .js v4)     │  │                │ │
│  │  mammoth)   │  │              │  │                │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ 로컬 벡터    │  │ 텍스트 분석   │  │ WebLLM         │ │
│  │ 검색        │  │ (NER, 분류)   │  │ (3-4B 모델)    │ │
│  │ (Vectra +   │  │              │  │ 선택적 로컬    │ │
│  │  IndexedDB) │  │              │  │ 추론           │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
│                                                         │
│  Pinia 상태관리 + IndexedDB (대화 기록) + PWA 오프라인    │
└────────────────────────┬────────────────────────────────┘
                         │ API 호출 (LLM, DB)
┌────────────────────────▼────────────────────────────────┐
│              Vercel Serverless (Nitro)                    │
│                                                         │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │ /api/auth/*  │  │ /api/llm/*  │  │ /api/db/*     │  │
│  │ (Better Auth │  │ (AI SDK v7  │  │ (Drizzle ORM  │  │
│  │  HttpOnly)   │  │  스트리밍)   │  │  → Neon)      │  │
│  └──────────────┘  └─────────────┘  └───────────────┘  │
│                                                         │
│  Upstash Redis (rate limit + 세션 캐시)                   │
└─────────────────────────────────────────────────────────┘
```

### 설계 원칙
1. **SPA 우선**: `ssr: false` — 검색엔진이 필요한 공개 페이지만 SSR/hybrid
2. **서버리스 극대화**: Vercel Fluid Compute + Neon scale-to-zero
3. **클라이언트 연산 극대화**: PDF 파싱, 임베딩, ATS 분석, 벡터 검색을 브라우저에서 처리
4. **LLM 비용 최적화**: 프롬프트 캐시 + 시맨틱 캐시 + 모델 라우팅

---

## 1. Phase 0: 보안 패치 + 즉시 수정 (1일)

### 1.1 Drizzle ORM 보안 패치

**변경 파일**: `package.json`

```diff
- "drizzle-orm": "^0.38.3",
+ "drizzle-orm": "^0.45.2",
- "drizzle-kit": "^0.30.1",
+ "drizzle-kit": "^0.31.10",
```

**CVE-2026-39356 (CVSS 7.5)**: `sql.identifier()` SQL 인젝션 취약점. 스키마 변경 불필요, 패키지만 업그레이드.

### 1.2 zod 명시적 의존성 추가

**변경 파일**: `package.json`

```diff
  "dependencies": {
+   "zod": "^3.25.0",
    ...
  }
```

현재 `ai` 패키지의 트랜시티브 의존성으로 동작 중. 5개 서비스 파일에서 import 사용.

### 1.3 하드코딩 시크릿 제거

**변경 파일**: `docker-compose.yml`, `nuxt.config.ts`

```yaml
# docker-compose.yml — 환경변수 참조로 변경
- NUXT_SESSION_PASSWORD: kairos-session-super-secret-key-32-chars-minimum
+ NUXT_SESSION_PASSWORD: ${NUXT_SESSION_PASSWORD}

- JWT_SECRET: kairos-jwt-secret-key-2026-hyper-secure
+ JWT_SECRET: ${JWT_SECRET}
```

```typescript
// nuxt.config.ts — fallback 제거
- jwtSecret: process.env.JWT_SECRET || 'kairos-super-secret-jwt-key-2026',
+ jwtSecret: process.env.JWT_SECRET,
```

### 1.4 deprecated docker-compose version 키 제거

```diff
- version: '3.8'
  services:
```

---

## 2. Phase 1: Nuxt 4 + 프레임워크 업그레이드 (3-5일)

### 2.1 Nuxt 3 → 4 업그레이드

**변경 파일**: `package.json`

```diff
- "nuxt": "^3.15.0",
+ "nuxt": "^4.5.1",
- "vue": "^3.5.13",
+ "vue": "^3.5.13",
- "vue-router": "^4.5.0",
+ "vue-router": "^5.0.0",
```

**마이그레이션 명령어**:
```bash
# 자동 코데모드 실행
npx codemod@0.18.7 nuxt/4/migration-recipe

# 파일 구조 이동 (pages, components, composables → app/)
npx codemod@latest nuxt/4/file-structure
```

**디렉토리 구조 변경**:
```
# 변경 전 (Nuxt 3):
├── pages/
├── components/
├── composables/
├── layouts/
├── middleware/
├── plugins/
├── assets/
├── app.vue

# 변경 후 (Nuxt 4):
├── app/
│   ├── pages/
│   ├── components/
│   ├── composables/
│   ├── layouts/
│   ├── middleware/
│   ├── plugins/
│   ├── utils/
│   ├── assets/
│   ├── app.vue
├── server/          # 루트 유지
├── public/          # 루트 유지
├── shared/          # NEW — Vue/Nitro 공유 타입
├── nuxt.config.ts
```

### 2.2 nuxt.config.ts 전면 개편

**현재 설정 → 목표 설정**:

```typescript
// nuxt.config.ts (목표)
export default defineNuxtConfig({
  compatibilityDate: '2026-07-28',
  future: { compatibilityVersion: 4 },

  // SPA 모드 — 인증된 라우트는 모두 SPA
  routeRules: {
    '/': { prerender: true },           // 랜딩은 정적 생성
    '/auth/**': { ssr: false },          // 로그인/회원가입은 SPA
    '/dashboard/**': { ssr: false },     // 대시보드는 SPA
    '/resume/**': { ssr: false },        // 이력서는 SPA
    '/interview/**': { ssr: false },     // 면접은 SPA
    '/ats/**': { ssr: false },           // ATS는 SPA
    '/humanizer/**': { ssr: false },     // 휴마나이저는 SPA
    '/qa/**': { ssr: false },            // Q&A는 SPA
    '/career/**': { ssr: false },        // 커리어는 SPA
  },

  modules: [
    '@nuxt/ui',           // v4 업그레이드
    '@vite-pwa/nuxt',     // PWA 지원
    '@vueuse/nuxt',       // 유틸리티
  ],

  // nuxt-auth-utils 제거 → Better Auth로 교체
  // (Phase 3에서 상세)

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    upstashRedisUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashRedisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
    public: {
      appName: 'Kairos',
      appSubtitle: 'AI Job-Application Prep Platform',
      webgpuEnabled: false, // 클라이언트에서 감지 후 업데이트
    }
  },

  nitro: {
    // 서버리스 최적화
    experimental: { asyncContext: true },
    storage: {
      cache: { driver: 'memory' }, // 개발용, 프로덕션은 Upstash
    },
  },

  // PWA 설정
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Kairos - AI Job Prep',
      short_name: 'Kairos',
      display: 'standalone',
      theme_color: '#0f0a1a',
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\./,
          handler: 'NetworkFirst',
          options: { cacheName: 'api', networkTimeoutSeconds: 5 }
        }
      ]
    }
  },
})
```

### 2.3 Nuxt UI v2 → v4 업그레이드

**변경 파일**: `package.json`

```diff
- "@nuxt/ui": "^2.19.2",
+ "@nuxt/ui": "^4.10.0",
```

**주요 변경사항**:
- Tailwind CSS v3 → v4 (CSS 기반 설정)
- Headless UI → Reka UI
- 컴포넌트 API 전면 변경 (55+ 프리미티브)

**CSS 마이그레이션**:
```css
/* app/assets/css/main.css — Tailwind v4 마이그레이션 */
@import "tailwindcss";

/* 기존 @apply 코드 → Tailwind v4 호환으로 변경 필요 */
```

### 2.4 사용하지 않는 의존성 제거

```diff
  "dependencies": {
-   "lucide-vue-next": "^0.469.0",  // 아이콘 미사용
-   "clsx": "^2.1.1",               // 미import
-   "tailwind-merge": "^2.6.0",     // 미import
-   "nuxt-auth-utils": "^0.5.8",    // Better Auth로 교체
    ...
  }
```

---

## 3. Phase 2: Vercel AI SDK v4 → v7 + LLM 아키텍처 (5-7일)

### 3.1 패키지 업그레이드

**변경 파일**: `package.json`

```diff
- "ai": "^4.0.22",
+ "ai": "^7.0.32",
- "@ai-sdk/openai": "^1.0.11",
+ "@ai-sdk/openai": "^4.0.0",
- "@ai-sdk/anthropic": "^1.0.6",
+ "@ai-sdk/anthropic": "^4.0.0",
- "@ai-sdk/google": "^1.0.12",
+ "@ai-sdk/google": "^4.0.0",
+ "@ai-sdk/vue": "^7.0.0",         // Vue useChat
+ "@ai-sdk/otel": "^1.0.0",        // OpenTelemetry
```

### 3.2 AI SDK v7 코데모드 실행

```bash
npx @ai-sdk/codemod v7
```

**자동 변경되는 API**:
| v6/v4 | v7 |
|-------|-----|
| `system` | `instructions` |
| `onFinish` | `onEnd` |
| `maxSteps` | `stopWhen: stepCountIs(N)` |
| `StreamingTextResponse` | `createUIMessageStreamResponse()` |
| `generateObject` | `generateText({ output })` |
| `streamObject` | `streamText({ output })` |

### 3.3 서버 사이드 LLM 서비스 재설계

**현재**: `server/services/llm.ts` — 단일 LLM 호출 함수
**목표**: LLM 호출은 서버리스 API 라우트로, 클라이언트 AI는 브라우저에서

**`server/services/llm.ts` (v7 마이그레이션)**:

```typescript
// server/services/llm.ts (v7 목표)
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText, createUIMessageStreamResponse } from 'ai';

export function getPreferredLanguageModel() {
  const config = useRuntimeConfig();

  // 모델 라우팅: 비용 최적화
  // 복잡도 높음 → Claude Fable 5 / GPT-5.6
  // 복잡도 중간 → Sonnet 4.6 / GPT-4.1
  // 복잡도 낮음 → Haiku 4.5 / GPT-4.1-mini / Qwen3 (Cloudflare Workers AI)

  if (config.anthropicApiKey) {
    const anthropic = createAnthropic({ apiKey: config.anthropicApiKey });
    return anthropic('claude-haiku-4-5-20251001'); // 기본: 저가 모델
  }

  if (config.openaiApiKey) {
    const openai = createOpenAI({ apiKey: config.openaiApiKey });
    return openai('gpt-4.1-mini');
  }

  if (config.googleApiKey) {
    const google = createGoogleGenerativeAI({ apiKey: config.googleApiKey });
    return google('gemini-3.5-flash');
  }

  throw new Error('No LLM API key configured');
}

// 복잡도별 모델 선택 (모델 라우팅)
export function getModelForComplexity(
  complexity: 'low' | 'medium' | 'high'
) {
  const config = useRuntimeConfig();

  if (complexity === 'high') {
    // 복잡한 추론: 이력서 개선, 면접 피드백
    if (config.anthropicApiKey) {
      return createAnthropic({ apiKey: config.anthropicApiKey })('claude-sonnet-4-6-20250514');
    }
    return createOpenAI({ apiKey: config.openaiApiKey })('gpt-4.1');
  }

  if (complexity === 'medium') {
    // 중간 복잡도: ATS 분석, Q&A 생성
    if (config.anthropicApiKey) {
      return createAnthropic({ apiKey: config.anthropicApiKey })('claude-haiku-4-5-20251001');
    }
    return createOpenAI({ apiKey: config.openaiApiKey })('gpt-4.1-mini');
  }

  // 낮은 복잡도: 텍스트 분류, 요약
  return getPreferredLanguageModel();
}
```

### 3.4 클라이언트 사이드 AI 서비스 (신규)

**`app/composables/useClientAI.ts`** (신규):

```typescript
// 클라이언트 사이드 AI — 브라우저에서 실행
import { pipeline, env } from '@huggingface/transformers';

// WebGPU 감지
const hasWebGPU = typeof navigator !== 'undefined' && !!navigator.gpu;

// 임베딩 모델 로드 (한 번만)
let embeddingPipeline: any = null;

export async function getClientEmbedding(text: string): Promise<number[]> {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline(
      'feature-extraction',
      'mixedbread-ai/mxbai-embed-xsmall-v1',  // 384-dim, ~80MB
      { device: hasWebGPU ? 'webgpu' : 'wasm' }
    );
  }
  const result = await embeddingPipeline(text, { pooling: 'mean', normalize: true });
  return Array.from(result.data);
}

// 텍스트 분류 (ATS 키워드 매칭용)
export async function classifyText(
  text: string,
  labels: string[]
): Promise<{ label: string; score: number }[]> {
  const classifier = await pipeline(
    'zero-shot-classification',
    'Xenova/nli-deberta-v3-base',
    { device: hasWebGPU ? 'webgpu' : 'wasm' }
  );
  const result = await classifier(text, labels);
  return result.labels.map((l: string, i: number) => ({
    label: l,
    score: result.scores[i],
  }));
}
```

**`app/composables/useLocalATS.ts`** (신규):

```typescript
// 클라이언트 사이드 ATS 점수 계산
export function calculateLocalATS(
  resumeText: string,
  jobDescription: string
): {
  matchScore: number;
  foundKeywords: string[];
  missingKeywords: string[];
  keywordDensity: number;
} {
  // JD에서 키워드 추출
  const jdKeywords = extractKeywords(jobDescription);
  const resumeLower = resumeText.toLowerCase();

  const foundKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const kw of jdKeywords) {
    if (resumeLower.includes(kw.toLowerCase())) {
      foundKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  }

  const matchScore = Math.round((foundKeywords.length / jdKeywords.length) * 100);
  const wordCount = resumeText.split(/\s+/).length;
  const keywordDensity = foundKeywords.reduce(
    (sum, kw) => sum + (resumeLower.split(kw.toLowerCase()).length - 1),
    0
  ) / wordCount * 100;

  return { matchScore, foundKeywords, missingKeywords, keywordDensity };
}

function extractKeywords(text: string): string[] {
  // 기술 스택, 자격증, 도구명 추출 (정규식 기반)
  const patterns = [
    /\b(JavaScript|TypeScript|Python|Java|Go|Rust|C\+\+)\b/gi,
    /\b(React|Vue|Nuxt|Next\.js|Angular|Svelte)\b/gi,
    /\b(Node\.js|Express|FastAPI|Django|Spring)\b/gi,
    /\b(PostgreSQL|MySQL|MongoDB|Redis|DynamoDB)\b/gi,
    /\b(AWS|GCP|Azure|Docker|Kubernetes|Terraform)\b/gi,
    /\b(REST|GraphQL|gRPC|WebSocket)\b/gi,
  ];

  const keywords = new Set<string>();
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      keywords.add(match[0]);
    }
  }
  return Array.from(keywords);
}
```

### 3.5 클라이언트 사이드 PDF/DOCX 파서 (신규)

**`app/composables/useDocumentParser.ts`** (신규):

```typescript
// 브라우저에서 PDF/DOCX 파싱 — 서버 호출 불필요
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// PDF.js 워커 설정 (Web Worker에서 실행)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function parsePDF(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(' ') + '\n';
  }
  return text.trim();
}

export async function parseDOCX(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

export async function parseResumeFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    return parsePDF(arrayBuffer);
  }
  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.endsWith('.docx')
  ) {
    return parseDOCX(arrayBuffer);
  }
  // 텍스트 파일
  return new TextDecoder().decode(arrayBuffer);
}
```

### 3.6 클라이언트 사이드 벡터 검색 (신규)

**`app/composables/useLocalVectorSearch.ts`** (신규):

```typescript
// 브라우저에서 벡터 검색 — IndexedDB에 저장
import { LocalDocumentIndex, TransformersEmbeddings, IndexedDBStorage } from 'vectra/browser';

let documentIndex: LocalDocumentIndex | null = null;

export async function initVectorSearch() {
  if (documentIndex) return documentIndex;

  const embeddings = new TransformersEmbeddings({
    model: 'Xenova/all-MiniLM-L6-v2',  // 384-dim, ~20MB
    device: 'auto',  // WebGPU 우선, WASM 폴백
  });

  const storage = new IndexedDBStorage('kairos-vector-db');

  documentIndex = new LocalDocumentIndex({
    embeddings,
    storage,
  });

  return documentIndex;
}

export async function indexDocument(id: string, text: string, metadata: Record<string, any>) {
  const index = await initVectorSearch();
  await index.upsertDocument(id, text, metadata);
}

export async function searchDocuments(query: string, topK: number = 5) {
  const index = await initVectorSearch();
  const results = await index.queryDocuments(query, topK);
  return results;
}
```

### 3.7 로컬 LLM 추론 (WebLLM — 선택적)

**`app/composables/useLocalLLM.ts`** (신규):

```typescript
// 선택적 로컬 LLM — 오프라인 또는 프라이버시 우선 시
import { CreateWebLLM } from '@mlc-ai/web-llm';

let engine: any = null;

export async function initLocalLLM() {
  if (engine) return engine;

  // WebGPU 감지
  if (!navigator.gpu) {
    console.warn('WebGPU not supported, local LLM unavailable');
    return null;
  }

  engine = await CreateWebLLM({
    model: 'Qwen/Qwen3-1.7B-q4f16_1-MLC',  // ~1.5GB, 24GB RAM 가능
    logLevel: 'INFO',
  });

  return engine;
}

export async function chatLocal(messages: { role: string; content: string }[]) {
  const engine = await initLocalLLM();
  if (!engine) return null;

  const response = await engine.chat.completions.create({
    messages,
    temperature: 0.7,
    max_tokens: 2048,
  });

  return response.choices[0].message.content;
}
```

---

## 4. Phase 3: 인증 시스템 전환 (2-3일)

### 4.1 Better Auth 도입

**변경 파일**: `package.json`

```diff
+ "better-auth": "^1.2.0",
```

**`server/auth.ts`** (신규):

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle";
import { db } from '../db';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password) => {
        const bcrypt = await import('bcryptjs');
        return bcrypt.hash(password, 12);
      },
      verify: async ({ password, hash }) => {
        const bcrypt = await import('bcryptjs');
        return bcrypt.compare(password, hash);
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7일
    updateAge: 60 * 60 * 24,      // 24시간마다 갱신
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7,
    },
  },
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    },
  },
});
```

### 4.2 인증 API 라우트 재설계

**변경 파일**: `server/api/auth/*.ts`

```typescript
// server/api/auth/register.post.ts
import { auth } from '../../auth';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const result = await auth.api.signUpEmail({
    body: { email: body.email, password: body.password, name: body.name },
  });
  return result;
});

// server/api/auth/login.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const result = await auth.api.signInEmail({
    body: { email: body.email, password: body.password },
  });
  // HttpOnly 쿠키로 세션 자동 설정
  return result;
});
```

### 4.3 클라이언트 인증 코모저블

**`app/composables/useAuth.ts`** (신규):

```typescript
export function useAuth() {
  const user = useState('auth-user', () => null);
  const session = useState('auth-session', () => null);

  async function login(email: string, password: string) {
    const result = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    session.value = result.session;
    user.value = result.user;
  }

  async function register(email: string, password: string, name: string) {
    const result = await $fetch('/api/auth/register', {
      method: 'POST',
      body: { email, password, name },
    });
    session.value = result.session;
    user.value = result.user;
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' });
    session.value = null;
    user.value = null;
    navigateTo('/auth/login');
  }

  async function fetchSession() {
    try {
      const result = await $fetch('/api/auth/me');
      session.value = result.session;
      user.value = result.user;
    } catch {
      session.value = null;
      user.value = null;
    }
  }

  return { user, session, login, register, logout, fetchSession };
}
```

---

## 5. Phase 4: 서버리스 DB + Rate Limiting (2-3일)

### 5.1 Neon Postgres 마이그레이션

**변경 파일**: `package.json`

```diff
- "pg": "^8.13.1",
+ "@neondatabase/serverless": "^0.10.0",
+ "drizzle-orm/neon-http": "^0.45.2",
```

**`db/index.ts` (재설계)**:

```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// 서버리스: 매 요청마다 새 연결 (HTTP 기반)
// 연결 풀링 불필요 — neon-http가 자동 처리
```

**Drizzle 설정 변경** (`drizzle.config.ts`):

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,           // 마이그레이션용 직접 연결
    urlUnpooled: process.env.DATABASE_URL_UNPOOLED!, // 풀링 없는 연결
  },
});
```

### 5.2 Upstash Redis Rate Limiting

**변경 파일**: `package.json`

```diff
+ "@upstash/ratelimit": "^2.0.0",
+ "@upstash/redis": "^1.35.0",
```

**`server/middleware/rateLimit.ts`** (신규):

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, '10 s'), // 10초에 30회
  analytics: true,
});

// LLM 엔드포인트: 더 엄격한 제한
const llmRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '60 s'), // 60초에 10회
  analytics: true,
});

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;

  // LLM 관련 API는 더 엄격하게
  const limiter = path.includes('/refine') ||
                  path.includes('/chat') ||
                  path.includes('/analyze') ||
                  path.includes('/humanize') ||
                  path.includes('/generate')
    ? llmRatelimit
    : ratelimit;

  const ip = getRequestHeader(event, 'x-forwarded-for') ?? '127.0.0.1';
  const { success, limit, remaining, reset } = await limiter.limit(ip);

  setResponseHeader(event, 'X-RateLimit-Limit', limit.toString());
  setResponseHeader(event, 'X-RateLimit-Remaining', remaining.toString());

  if (!success) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Rate limit exceeded',
      headers: { 'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString() },
    });
  }
});
```

---

## 6. Phase 5: LLM 비용 최적화 (1-2일)

### 6.1 프롬프트 캐시 (Anthropic)

`server/services/llm.ts`에 `cache_control` 추가:

```typescript
import { generateText } from 'ai';

// 시스템 프롬프트에 캐시 브레이크포인트 추가
const systemPrompt = [
  {
    type: 'text' as const,
    text: `You are Kairos AI, a world-class career advisor...`,
    cacheControl: { type: 'ephemeral' as const },
  },
];

// Anthropic 호출 시 90% 입력 비용 절감
```

### 6.2 시맨틱 캐시 (Redis)

**`server/services/llmCache.ts`** (신규):

```typescript
import { Redis } from '@upstash/redis';
import { embed } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 동일한 프롬프트 → 캐시된 응답 반환
export async function getCachedResponse(prompt: string, model: string): Promise<string | null> {
  const hash = await sha256(prompt + model);
  return redis.get(`llm:cache:${hash}`);
}

export async function setCachedResponse(prompt: string, model: string, response: string, ttl: number = 3600) {
  const hash = await sha256(prompt + model);
  await redis.set(`llm:cache:${hash}`, response, { ex: ttl });
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
```

---

## 7. Phase 6: PWA + 오프라인 지원 (2-3일)

### 7.1 PWA 서비스 워커

**`app/composables/useOfflineQueue.ts`** (신규):

```typescript
// 오프라인 시 LLM 요청 큐잉
import { openDB, type IDBPDatabase } from 'idb';

interface QueuedRequest {
  id?: number;
  url: string;
  method: string;
  body: any;
  timestamp: number;
}

let db: IDBPDatabase | null = null;

async function getDB() {
  if (db) return db;
  db = await openDB('kairos-offline', 1, {
    upgrade(upgradeDB) {
      upgradeDB.createObjectStore('pending-requests', { keyPath: 'id', autoIncrement: true });
    },
  });
  return db;
}

export async function queueRequest(url: string, method: string, body: any) {
  const db = await getDB();
  await db.add('pending-requests', { url, method, body, timestamp: Date.now() });
}

export async function processQueue() {
  const db = await getDB();
  const tx = db.transaction('pending-requests', 'readwrite');
  const requests = await tx.store.getAll();

  for (const req of requests) {
    try {
      await $fetch(req.url, { method: req.method, body: req.body });
      await tx.store.delete(req.id!);
    } catch {
      // 실패 시 다음 기회에
    }
  }
}

// 온라인 복구 시 큐 처리
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => processQueue());
}
```

### 7.2 IndexedDB 대화 기록

**`app/composables/useChatHistory.ts`** (신규):

```typescript
import { openDB, type IDBPDatabase } from 'idb';

interface ChatMessage {
  id?: number;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

let db: IDBPDatabase | null = null;

async function getDB() {
  if (db) return db;
  db = await openDB('kairos-chat', 1, {
    upgrade(upgradeDB) {
      const store = upgradeDB.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
      store.createIndex('sessionId', 'sessionId');
    },
  });
  return db;
}

export async function saveMessage(sessionId: string, role: 'user' | 'assistant', content: string) {
  const db = await getDB();
  await db.add('messages', { sessionId, role, content, timestamp: Date.now() });
}

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const db = await getDB();
  return db.getAllFromIndex('messages', 'sessionId', sessionId);
}
```

---

## 8. Phase 7: API 라우트 전면 재설계 (5-7일)

### 8.1 클라이언트 사이드 처리로 전환하는 엔드포인트

| 기존 엔드포인트 | 변경 후 | 이유 |
|---|---|---|
| `POST /api/resumes/parse.post.ts` | **클라이언트 처리** | pdf.js + mammoth.js가 브라우저에서 동작 |
| `POST /api/careers/search.get.ts` | **클라이언트 처리** | Vectra.js + IndexedDB로 로컬 벡터 검색 |
| `POST /api/ats/analyze.post.ts` | **하이브리드** | 로컬 키워드 매칭 + 서버 LLM 분석 |

### 8.2 서버리스에 남는 엔드포인트

| 엔드포인트 | 이유 |
|---|---|
| `POST /api/auth/*` | 시크릿 관리, 세션 발급 |
| `POST /api/resumes/refine.post.ts` | 복잡한 LLM 추론 (Claude Sonnet/GPT-4.1) |
| `POST /api/interviews/chat.post.ts` | SSE 스트리밍 LLM |
| `POST /api/humanizer/process.post.ts` | 톤 변환 LLM |
| `POST /api/qa/generate.post.ts` | Q&A 생성 LLM |
| `GET/POST /api/resumes/*` | DB CRUD |
| `GET/POST /api/interviews/*` | DB CRUD |
| `GET/POST /api/careers/*` | DB CRUD + 서버 pgvector (대규모 검색용) |

### 8.3 서버사이드 LLM API 라우트 예시

**`server/api/llm/refine.post.ts`** (신규 — 기존 resumes/refine과 통합):

```typescript
import { streamText } from 'ai';
import { getModelForComplexity } from '../../services/llm';
import { getCachedResponse, setCachedResponse } from '../../services/llmCache';

export default defineEventHandler(async (event) => {
  const { resumeText, jobDescription } = await readBody(event);

  // 캐시 확인
  const cacheKey = `refine:${resumeText.slice(0, 200)}:${jobDescription?.slice(0, 200)}`;
  const cached = await getCachedResponse(cacheKey, 'refine');
  if (cached) return JSON.parse(cached);

  const model = getModelForComplexity('high');

  const result = await streamText({
    model,
    instructions: `You are Kairos AI career advisor. Rewrite the resume...`,
    prompt: `Resume:\n${resumeText}\n\nJob Description:\n${jobDescription}`,
  });

  // 스트리밍 응답
  return result.toUIMessageStreamResponse();
});
```

---

## 9. Phase 8: Nuxt UI v4 + UI 재설계 (7-10일)

### 9.1 Tailwind CSS v3 → v4

```css
/* app/assets/css/main.css */
@import "tailwindcss";

/* 커스텀 테마 (Deep Space Violet, Celestial Gold, Cyber Amber) */
@theme {
  --color-kairos-bg: #0f0a1a;
  --color-kairos-card: rgba(255, 255, 255, 0.05);
  --color-kairos-border: rgba(255, 255, 255, 0.08);
  --color-kairos-gold: #d4a843;
  --color-kairos-amber: #f59e0b;
  --color-kairos-purple: #8b5cf6;
  --color-kairos-cyan: #06b6d4;
  --color-kairos-text: #e2e8f0;
  --color-kairos-muted: #94a3b8;

  --font-display: 'Outfit', sans-serif;
  --font-body: 'Plus Jakarta Sans', sans-serif;
}
```

### 9.2 Nuxt UI v4 컴포넌트 마이그레이션

| 기존 (v2) | 목표 (v4) |
|---|---|
| `<UButton>` | `<UButton>` (API 변경, prop 이름 변경) |
| `<UModal>` | `<UModal>` (Reka UI 기반) |
| `<UTable>` | `<UTable>` (재설계된 API) |
| `<UInput>` | `<UInput>` (Tailwind Variants) |
| `<UNavbar>` | `<UNavigationMenu>` |

### 9.3 Glassmorphism 디자인 시스템

```css
/* 기존 glassmorphism → Tailwind v4 호환 */
.glass-card {
  background: var(--color-kairos-card);
  backdrop-filter: blur(16px);
  border: 1px solid var(--color-kairos-border);
  border-radius: 1rem;
}
```

---

## 10. 의존성 최종 목록

### 추가되는 패키지
| 패키지 | 버전 | 용도 |
|---|---|---|
| `better-auth` | ^1.2.0 | 인증 (BFF 패턴) |
| `@ai-sdk/vue` | ^7.0.0 | Vue useChat |
| `@ai-sdk/otel` | ^1.0.0 | OpenTelemetry |
| `@neondatabase/serverless` | ^0.10.0 | 서버리스 PostgreSQL |
| `@upstash/ratelimit` | ^2.0.0 | Rate limiting |
| `@upstash/redis` | ^1.35.0 | Redis (Upstash) |
| `@vite-pwa/nuxt` | ^0.10.0 | PWA 지원 |
| `@vueuse/nuxt` | ^12.0.0 | 유틸리티 |
| `@huggingface/transformers` | ^4.2.0 | 클라이언트 AI (임베딩, 분류) |
| `vectra` | ^0.15.0 | 브라우저 벡터 검색 |
| `@mlc-ai/web-llm` | ^0.2.84 | 선택적 로컬 LLM |
| `idb` | ^8.0.0 | IndexedDB 래퍼 |
| `zod` | ^3.25.0 | 스키마 검증 |
| `pdfjs-dist` | ^6.1.200 | 클라이언트 PDF 파싱 (버전 업) |
| `mammoth` | ^1.12.0 | 클라이언트 DOCX 파싱 (버전 업) |

### 제거되는 패키지
| 패키지 | 이유 |
|---|---|
| `lucide-vue-next` | 미사용 |
| `clsx` | 미사용 |
| `tailwind-merge` | 미사용 |
| `nuxt-auth-utils` | Better Auth로 교체 |
| `jsonwebtoken` | Better Auth 내장 |
| `pg` | @neondatabase/serverless로 교체 |

### 업그레이드되는 패키지
| 패키지 | 현재 | 목표 |
|---|---|---|
| `nuxt` | ^3.15.0 | ^4.5.1 |
| `ai` | ^4.0.22 | ^7.0.32 |
| `@ai-sdk/openai` | ^1.0.11 | ^4.0.0 |
| `@ai-sdk/anthropic` | ^1.0.6 | ^4.0.0 |
| `@ai-sdk/google` | ^1.0.12 | ^4.0.0 |
| `@nuxt/ui` | ^2.19.2 | ^4.10.0 |
| `drizzle-orm` | ^0.38.3 | ^0.45.2 |
| `drizzle-kit` | ^0.30.1 | ^0.31.10 |
| `vue-router` | ^4.5.0 | ^5.0.0 |

---

## 11. 파일 변경 요약

### 신규 파일 (17개)
| 파일 | 용도 |
|---|---|
| `app/composables/useClientAI.ts` | 클라이언트 AI (임베딩, 분류) |
| `app/composables/useLocalATS.ts` | 로컬 ATS 점수 계산 |
| `app/composables/useDocumentParser.ts` | 브라우저 PDF/DOCX 파싱 |
| `app/composables/useLocalVectorSearch.ts` | 브라우저 벡터 검색 |
| `app/composables/useLocalLLM.ts` | 선택적 로컬 LLM (WebLLM) |
| `app/composables/useAuth.ts` | Better Auth 클라이언트 |
| `app/composables/useChatHistory.ts` | IndexedDB 대화 기록 |
| `app/composables/useOfflineQueue.ts` | 오프라인 요청 큐 |
| `server/auth.ts` | Better Auth 설정 |
| `server/middleware/rateLimit.ts` | Upstash rate limiting |
| `server/services/llmCache.ts` | 시맨틱/해시 캐시 |
| `server/api/llm/refine.post.ts` | LLM 이력서 개선 |
| `server/api/llm/stream.post.ts` | LLM SSE 스트리밍 |
| `shared/types.ts` | Vue/Nitro 공유 타입 |
| `vercel.json` | Vercel 설정 (선택) |
| `.env.example` | 환경변수 템플릿 (업데이트) |
| `drizzle/` | Drizzle 마이그레이션 파일 |

### 수정되는 파일 (20+개)
| 파일 | 변경 내용 |
|---|---|
| `package.json` | 모든 의존성 업그레이드 |
| `nuxt.config.ts` | SPA 모드, PWA, 런타임 설정 |
| `drizzle.config.ts` | Neon 연결 설정 |
| `db/index.ts` | neon-http 드라이버 |
| `db/schema.ts` | pgvector 타입 유지 (변경 없음) |
| `server/services/llm.ts` | AI SDK v7 + 모델 라우팅 |
| `server/services/resume.ts` | v7 API 마이그레이션 |
| `server/services/interview.ts` | v7 API 마이그레이션 |
| `server/services/ats.ts` | v7 API 마이그레이션 |
| `server/services/humanizer.ts` | v7 API 마이그레이션 |
| `server/services/qa.ts` | v7 API 마이그레이션 |
| `server/services/embedding.ts` | neon-http + 캐시 |
| `server/services/parser.ts` | 클라이언트로 이전 (서버 유지 불필요) |
| `server/middleware/auth.ts` | Better Auth 미들웨어 |
| `server/api/auth/*.ts` | Better Auth API |
| `app/app.vue` | Nuxt UI v4 `<UApp>` |
| `app/pages/**/*.vue` | Nuxt UI v4 컴포넌트 |
| `app/components/*.vue` | Nuxt UI v4 컴포넌트 |
| `app/assets/css/main.css` | Tailwind v4 |
| `docker-compose.yml` | 시크릿 참조 |
| `.gitignore` | 업데이트 |

---

## 12. 실행 순서 (의존성 기반)

```
Phase 0 (1일)  ──→ Drizzle 보안 패치 + zod + 시크릿
    │
Phase 1 (3-5일) ──→ Nuxt 4 + 디렉토리 구조 + UI v4
    │
Phase 2 (5-7일) ──→ AI SDK v7 + 클라이언트 AI 서비스
    │                (Phase 1 완료 후 시작)
    │
Phase 3 (2-3일) ──→ Better Auth + 인증 재설계
    │                (Phase 1 완료 후 시작, Phase 2와 병렬)
    │
Phase 4 (2-3일) ──→ Neon DB + Rate Limiting
    │                (Phase 1 완료 후 시작)
    │
Phase 5 (1-2일) ──→ LLM 비용 최적화
    │                (Phase 2 완료 후 시작)
    │
Phase 6 (2-3일) ──→ PWA + 오프라인
    │                (Phase 1 완료 후 시작)
    │
Phase 7 (5-7일) ──→ API 라우트 재설계
    │                (Phase 2, 3 완료 후)
    │
Phase 8 (7-10일) ──→ UI 재설계 + 전체 통합 테스트
                     (모든 Phase 완료 후)
```

**총 예상 기간**: 28-40일 (1명 개발 기준)

---

## 13. 비용 추정

### 개발/프로토타이핑
| 항목 | 월 비용 |
|---|---|
| Vercel Hobby | $0 |
| Neon Free | $0 |
| Upstash Free | $0 |
| OpenAI API (개발) | ~$10-20 |
| **합계** | **~$10-20/월** |

### 프로덕션 (중간 트래픽)
| 항목 | 월 비용 |
|---|---|
| Vercel Pro | $20 |
| Neon Launch | $19 |
| Upstash (1M 요청) | $4 |
| OpenAI API (10K 요청/일) | ~$50-100 |
| **합계** | **~$93-143/월** |

### 프로덕션 (고 트래픽)
| 항목 | 월 비용 |
|---|---|
| Vercel Pro | $20 |
| Neon Scale | $69 |
| Upstash (10M 요청) | $20 |
| OpenAI API (100K 요청/일) | ~$200-500 |
| Cloudflare Workers AI (임베딩) | ~$5 |
| **합계** | **~$314-614/월** |

---

## 14. 검증 계획

### 빌드 검증
```bash
# 1. 타입 체크
npx nuxt typecheck

# 2. 빌드
npm run build

# 3. Drizzle 마이그레이션
npx drizzle-kit generate
npx drizzle-kit migrate

# 4. PWA 라우트 확인
npm run generate  # 정적 생성 테스트
```

### 기능 검증
1. **인증**: 회원가입 → 로그인 → 세션 확인 → 로그아웃
2. **이력서 파싱**: 클라이언트에서 PDF/DOCX 업로드 → 텍스트 추출
3. **이력서 개선**: 서버 LLM 스트리밍 → 결과 표시
4. **면접**: SSE 스트리밍 → 실시간 대화
5. **ATS**: 로컬 키워드 매칭 + 서버 LLM 분석
6. **오프라인**: 네트워크 차단 → 큐잉 → 복구 시 전송
7. **PWA**: 설치 → 오프라인 접근 → 캐시된 리소스

### 성능 검증
- Lighthouse PWA 점수: 90+
- FCP (First Contentful Paint): < 1.5s
- TTI (Time to Interactive): < 3s
- LLM 첫 토큰: < 500ms
- 클라이언트 임베딩 생성: < 2s

---

*이 계획서는 3개 리서치 에이전트의 전방위 웹서치 결과와 기존 55개 소스 파일 분석을 기반으로 작성되었습니다.*
