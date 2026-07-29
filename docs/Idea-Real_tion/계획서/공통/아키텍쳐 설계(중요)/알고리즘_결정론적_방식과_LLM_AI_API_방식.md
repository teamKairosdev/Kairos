# 알고리즘 결정론적 방식과 진짜 LLM AI API 방식

> **작성일**: 2026-07-29  
> **목적**: Kairos의 각 기능이 "순수 알고리즘", "LLM API", "하이브리드" 중 어떤 방식으로 구현되어야 하는지 설계한다  
> **핵심 전제**: LLM을 쓰는 것보다 쓰지 않아야 할 때를 아는 것이 진짜 기술이다

---

## 왜 이 구분이 중요한가

### LLM API의 함정

```
[LLM을 모든 곳에 쓰면 생기는 문제]

① 비용: GPT-4o 기준 요청당 ~$0.01 → 100만 요청 = $10,000
② 지연: 평균 응답 2-5초 → 모든 클릭에 딜레이
③ 비결정론: 같은 입력에 다른 출력 → 재현 불가, 디버깅 어려움
④ 환각: 사실 기반 데이터(점수, 매칭률)를 LLM이 "만들어낼" 수 있음
⑤ 의존성: API 장애 시 서비스 전체 마비
```

### 알고리즘의 강점

```
[알고리즘(결정론적)이 더 나은 상황]

① 계산 가능한 것: 점수, 비율, 빈도수, 순위
② 구조화된 매칭: 키워드 A가 텍스트 B에 있는가? (Yes/No)
③ 템플릿 채우기: 정해진 구조에 데이터 삽입
④ 외부 데이터 수집: MCP/API로 실제 데이터 가져오기
⑤ 빠른 피드백이 필요한 UX: 입력 즉시 결과 (< 100ms)
```

---

## 1. 기능별 구현 방식 결정 매트릭스

| 기능 | 순수 알고리즘 | LLM API | 하이브리드 | 우선 방식 |
|------|:-----------:|:-------:|:---------:|:--------:|
| ATS 키워드 매칭 | [v] 충분 | 오버스펙 | — | **알고리즘** |
| ATS 매칭 점수 계산 | [v] 충분 | 오버스펙 | — | **알고리즘** |
| ATS 개선 제안 문장 | [x] 불가 | [v] 필요 | — | **LLM** |
| 이력서 고도화 (재작성) | [x] 불가 | [v] 필요 | — | **LLM** |
| 이력서 점수 (구조 평가) | [v] 부분 | △ 보완 | [v] | **하이브리드** |
| 면접 질문 생성 | [x] 불가 | [v] 필요 | — | **LLM** |
| 면접 답변 평가 | [x] 불가 | [v] 필요 | — | **LLM** |
| 면접 점수 계산 | [v] 충분 | 오버스펙 | — | **알고리즘** |
| AI 문장 휴머나이저 | [x] 불가 | [v] 필요 | — | **LLM** |
| Q&A 플래시카드 생성 | [x] 불가 | [v] 필요 | — | **LLM** |
| 채용공고 자동 수집 | [v] MCP/API | [x] 불필요 | — | **알고리즘(MCP)** |
| 사용자 통계 집계 | [v] 충분 | [x] 불필요 | — | **알고리즘** |
| 스킬 갭 분석 (국가급) | [v] 충분 | △ 보완 | [v] | **하이브리드** |
| 커리어 추천 | △ 부분 | [v] 필요 | [v] | **하이브리드** |

---

## 2. 알고리즘 결정론적 방식 (Deterministic)

### 2.1 ATS 키워드 매칭 엔진

> "채용공고에서 키워드를 추출하고, 이력서와 비교한다"  
> LLM 없이 순수 텍스트 처리로 구현 가능. 속도: < 100ms

**알고리즘 설계:**

```typescript
// 1단계: 채용공고 키워드 추출
function extractJDKeywords(jdText: string): KeywordSet {
  const tokens = tokenize(jdText)              // 형태소 분석 (konlpy 또는 자체)
  const stopwords = loadStopwords('ko')        // 불용어 제거
  const candidates = removeStopwords(tokens, stopwords)
  
  // 가중치 부여
  const weighted = candidates.map(token => ({
    word: token,
    weight: calculateWeight(token, jdText),   // TF-IDF 가중치
    isRequired: isRequiredKeyword(token, jdText), // "필수" 섹션 여부
    isTech: isTechKeyword(token),             // 기술 키워드 여부
  }))
  
  return weighted.sort((a, b) => b.weight - a.weight)
}

// 2단계: 매칭 점수 계산
function calculateATSScore(resume: string, jd: string): ATSResult {
  const jdKeywords = extractJDKeywords(jd)
  const resumeText = resume.toLowerCase()
  
  let score = 0
  const matched: string[] = []
  const missing: string[] = []
  
  for (const keyword of jdKeywords) {
    if (resumeText.includes(keyword.word.toLowerCase())) {
      matched.push(keyword.word)
      score += keyword.weight * (keyword.isRequired ? 2 : 1)  // 필수 키워드 2배 가중
    } else {
      missing.push(keyword.word)
    }
  }
  
  return {
    score: normalizeScore(score, jdKeywords),  // 0-100점으로 정규화
    matched,
    missing,
    matchRate: matched.length / jdKeywords.length * 100
  }
}
```

**핵심 포인트:**
- LLM 없이 < 100ms 응답
- 입력이 같으면 항상 같은 결과 (재현 가능)
- 비용: 무료 (서버 연산만)
- 필수 vs 우대 키워드 가중치 차등 적용

---

### 2.2 이력서 구조 점수 알고리즘

> "이력서가 얼마나 잘 구성되어 있는가"를 규칙 기반으로 평가

```typescript
interface ResumeScore {
  total: number        // 0-100
  breakdown: {
    hasQuantitativeMetrics: number  // 수치 포함 여부 (25점)
    hasActionVerbs: number          // 능동 동사 시작 (20점)
    hasRecentFirst: number          // 최신순 정렬 (10점)
    keywordDensity: number          // 키워드 밀도 (20점)
    lengthAppropriate: number       // 적절한 길이 (10점)
    sectionCompleteness: number     // 필수 섹션 포함 (15점)
  }
}

function scoreResume(resumeText: string): ResumeScore {
  // 규칙 1: 수치 포함 여부 (%, 개, 명, 원, 배)
  const quantitativePattern = /\d+[%개명원배억만천]|\d+\s*(percent|명|개)/g
  const hasMetrics = (resumeText.match(quantitativePattern) || []).length

  // 규칙 2: 능동 동사로 시작하는 항목 비율
  const actionVerbs = ['개발', '구현', '설계', '주도', '달성', '개선', '구축', '운영']
  const bulletPoints = resumeText.split(/\n[-•·]/).slice(1)
  const activeRatio = bulletPoints.filter(b => 
    actionVerbs.some(v => b.trim().startsWith(v))
  ).length / bulletPoints.length

  // 규칙 3: 필수 섹션 존재 여부
  const requiredSections = ['경력', '학력', '기술', '프로젝트']
  const sectionScore = requiredSections.filter(s => 
    resumeText.includes(s)
  ).length / requiredSections.length

  return {
    total: calculateTotal(...),
    breakdown: { ... }
  }
}
```

---

### 2.3 외부 데이터 수집 — MCP / API 연동

> "채용공고, 임금 정보, 취업 통계를 실제 데이터 소스에서 가져온다"

```typescript
// 워크넷 공공 API 연동
async function fetchWorknetJobs(params: {
  jobCategory: string
  region: string
  experience: 'entry' | 'junior' | 'senior'
}): Promise<JobPosting[]> {
  const response = await fetch(
    `https://openapi.work.go.kr/opi/opi/opia/wantedApi.do` +
    `?authKey=${process.env.WORKNET_API_KEY}` +
    `&callTp=L&returnType=JSON` +
    `&jobCd=${params.jobCategory}` +
    `&locCd=${params.region}`
  )
  return response.json()
}

// 고용24 취업 통계 API
async function fetchEmploymentStats(region: string): Promise<EmploymentData> {
  // 고용노동부 공공데이터 포털 API
  const url = `https://apis.data.go.kr/B552474/EmployStatsService/...`
  const data = await fetch(url, { headers: { apiKey: process.env.MOEL_API_KEY } })
  return data.json()
}

// 통계청 KOSIS API — 지역별 청년 고용률
async function fetchKOSISData(statsCode: string): Promise<StatisticsData> {
  const url = `https://kosis.kr/openapi/Param/statisticsParameterData.do`
  // ...
}
```

**연동 가능한 공공 데이터 소스:**

| 데이터 소스 | 제공 데이터 | API 형태 |
|-----------|-----------|---------|
| 워크넷 (고용노동부) | 채용공고, 직무 정보 | REST API (공개) |
| 고용24 | 취업 통계, 실업급여 | REST API (공개) |
| 통계청 KOSIS | 청년 고용률, 지역별 통계 | REST API (공개) |
| NCS (국가직무능력표준) | 직무별 필요 능력 | REST API |
| 학교알리미 | 대학별 취업률 | 공공데이터포털 |
| 경기도 데이터포털 | 경기도 청년 고용 현황 | REST API |

---

### 2.4 메시지 템플릿 시스템

> "LLM이 아닌 구조화된 템플릿 + 데이터 주입으로 응답 생성"

**템플릿 예시 — ATS 분석 결과 메시지:**

```typescript
// 템플릿 정의
const ATS_RESULT_TEMPLATE = `
{{userName}}님의 이력서를 {{jobTitle}} 채용공고와 비교했습니다.

전체 매칭률: {{matchRate}}%
- 이미 갖춘 핵심 역량: {{matchedCount}}개
- 아직 부족한 역량: {{missingCount}}개

{{#if matchRate >= 80}}
 매우 높은 매칭률입니다! 지금 바로 지원해보세요.
{{else if matchRate >= 60}}
 어느 정도 준비됐습니다. 아래 {{missingCount}}개만 보완하면 더 좋아집니다.
{{else}}
 이 공고와 갭이 있습니다. 먼저 이력서 고도화를 추천합니다.
{{/if}}

가장 먼저 보완할 것:
{{#each topMissingKeywords as keyword}}
  • {{keyword.word}}: {{keyword.suggestion}}
{{/each}}
`

// 데이터 주입
function generateATSMessage(data: ATSResult, user: User): string {
  return renderTemplate(ATS_RESULT_TEMPLATE, {
    userName: user.name,
    jobTitle: data.jobTitle,
    matchRate: data.matchRate,
    matchedCount: data.matched.length,
    missingCount: data.missing.length,
    topMissingKeywords: data.missing.slice(0, 3).map(kw => ({
      word: kw,
      suggestion: KEYWORD_SUGGESTIONS[kw] || '이력서에 관련 경험 추가'
    }))
  })
}
```

**템플릿 시스템의 장점:**
- 비용: 무료 (LLM 호출 없음)
- 속도: < 10ms
- 일관성: 항상 같은 구조
- 다국어: 템플릿만 번역하면 됨 (i18n)
- A/B 테스트: 템플릿 버전별 성과 측정 가능

---

## 3. LLM AI API 방식 (Generative)

### 3.1 언제 LLM을 써야 하는가

```
LLM이 반드시 필요한 조건:
① 자연어 생성 (새로운 문장 작성)
② 복잡한 맥락 이해 (문서 전체를 읽고 판단)
③ 창의적 재구성 (다른 표현으로 바꾸기)
④ 열린 질문에 대한 답변 (면접 Q&A)
⑤ 감정·어조 분석 (인간적인 글인가?)
```

### 3.2 이력서 3단계 고도화 파이프라인 — LLM 설계

```typescript
// Step 1: Draft — 구조 분석 + 초안 생성
const draftResult = await generateText({
  model: anthropic('claude-3-5-haiku-20241022'),  // 저비용 모델
  system: `당신은 채용 전문가입니다. 주어진 이력서를 분석하여
           개선이 필요한 항목을 JSON으로 출력하세요.`,
  prompt: `이력서:\n${resumeText}\n\n분석 결과를 JSON으로:`,
  output: 'object',
  schema: resumeAnalysisSchema,
  experimental_providerOptions: {
    anthropic: {
      cacheControl: { type: 'ephemeral' }  // 이력서 텍스트 캐싱
    }
  }
})

// Step 2: Evaluate — 약점 파악 (알고리즘 + LLM 혼합)
const algorithmScore = scoreResume(resumeText)           // 알고리즘 (빠름)
const llmEvaluation = await evaluateWithLLM(draftResult) // LLM (깊이)

// Step 3: Improve — 실제 문장 재작성
const improvedResult = await streamText({
  model: anthropic('claude-opus-4-5'),  // 고성능 모델 (최종 단계만)
  system: `당신은 10년 경력의 이력서 전문가입니다.
           ATS 통과에 최적화되고, 인간적인 문체로,
           수치 기반의 성과 중심으로 이력서를 개선하세요.`,
  prompt: buildImprovementPrompt(resumeText, draftResult, algorithmScore),
  experimental_providerOptions: {
    anthropic: {
      thinking: { type: 'enabled', budgetTokens: 1000 }
    }
  }
})
```

**비용 최적화 전략:**

| 단계 | 모델 | 이유 |
|------|------|------|
| Step 1 (분석) | `claude-3-5-haiku` | 분석은 저비용 모델로 충분 |
| Step 2 (평가) | 알고리즘 우선 | LLM 없이 처리 가능한 부분 |
| Step 3 (생성) | `claude-opus-4-5` | 최종 문장 품질이 중요한 단계만 고성능 |

---

### 3.3 면접 Q&A — LLM + 템플릿 하이브리드

```typescript
// 직무별 핵심 질문은 템플릿 풀(Pool)에서 선택 (알고리즘)
const questionPool = await db
  .select()
  .from(interviewQuestions)
  .where(eq(interviewQuestions.jobCategory, jobCategory))
  .where(eq(interviewQuestions.difficulty, difficulty))
  .orderBy(desc(interviewQuestions.effectiveness))
  .limit(20)

// 풀에서 선택된 질문을 기반으로 LLM이 개인화된 팔로우업 생성
const personalizedFollowUp = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  system: `면접관입니다. 지원자의 이전 답변을 바탕으로
           자연스러운 후속 질문을 생성하세요.`,
  prompt: `지원자 답변: ${userAnswer}\n\n후속 질문:`,
})
```

---

### 3.4 LLM 비용 제어 구조 (자동마진장치)

```typescript
// 요청 전 비용 추정
function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = {
    'claude-3-5-haiku': { input: 0.001, output: 0.005 },    // per 1K tokens
    'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
    'claude-opus-4-5': { input: 0.015, output: 0.075 },
  }
  const p = pricing[model]
  return (inputTokens * p.input + outputTokens * p.output) / 1000
}

// 사용자별 월간 비용 추적 + 한도 초과 시 차단
async function checkUserQuota(userId: string, estimatedCost: number): Promise<boolean> {
  const monthlyUsage = await getMonthlyUsage(userId)
  const plan = await getUserPlan(userId)
  const limit = PLAN_LIMITS[plan.type]   // Free: $1, Pro: $10, Team: $50

  if (monthlyUsage.cost + estimatedCost > limit) {
    await notifyQuotaExceeded(userId)   // 자동 이메일 발송
    return false  // 요청 차단
  }
  return true
}

// Upstash Redis 시맨틱 캐시 — 유사 요청 캐싱
async function getCachedOrGenerate(prompt: string, generator: () => Promise<string>) {
  const cacheKey = await semanticHash(prompt)  // 유사 프롬프트 해시
  const cached = await redis.get(cacheKey)
  if (cached) return cached                    // 캐시 히트: LLM 호출 없음

  const result = await generator()
  await redis.setex(cacheKey, 3600, result)   // 1시간 캐싱
  return result
}
```

---

## 4. 하이브리드 방식 — 알고리즘 + LLM 협력

### 4.1 이력서 점수 — 하이브리드 설계

```
[하이브리드 점수 계산]

알고리즘 점수 (60% 가중)          LLM 점수 (40% 가중)
──────────────────────────        ──────────────────
• 수치 포함 여부 (25점)           • 전체적 완성도
• 능동 동사 비율 (20점)           • 자연스러움
• 필수 섹션 존재 (15점)           • 일관성
• 키워드 밀도 (20점)              • 전문성 표현
• 적절한 길이 (10점)              • 인사담당자 관점

→ 최종 점수 = (알고리즘 × 0.6) + (LLM × 0.4)
→ LLM은 10점 단위 평가만 (정확도보다 방향성)
→ 비용: 알고리즘 부분은 무료, LLM은 경량 모델
```

### 4.2 스킬 갭 분석 — 국가 데이터 + LLM 해석

```
[국가급 스킬 갭 분석 파이프라인]

Step 1: 데이터 수집 (알고리즘 — 무료)
  ├── 워크넷 API → 이번 달 채용공고 직무별 요구 스킬 추출
  ├── Kairos 사용자 이력서 → 지원자 보유 스킬 집계
  └── 통계청 KOSIS → 지역별 청년 고용률

Step 2: 갭 계산 (알고리즘 — 무료)
  요구 스킬 TOP20 - 보유 스킬 TOP20 = 갭 스킬 TOP10

Step 3: 인사이트 생성 (LLM — 월 1회 배치)
  "경기도 20대 취업준비생의 가장 큰 스킬 갭은 
   클라우드 인프라(AWS/GCP)입니다. 
   이는 최근 6개월간 클라우드 직무 공고 42% 증가에 비해
   실제 보유자는 18% 증가에 그쳤기 때문입니다."

Step 4: 리포트 생성 (템플릿 — 무료)
  정부/대학에 제공하는 월간 스킬 갭 리포트
```

---

## 5. 구현 우선순위 (비용 효율 기준)

| 우선순위 | 기능 | 방식 | 비용/요청 | 구현 난이도 |
|:-------:|------|------|:--------:|:---------:|
| 1 | ATS 키워드 매칭 | 알고리즘 | $0 | 중 |
| 2 | 이력서 구조 점수 | 알고리즘 | $0 | 중 |
| 3 | ATS 결과 메시지 | 템플릿 | $0 | 하 |
| 4 | 채용공고 수집 | MCP/API | $0 | 중 |
| 5 | 이력서 고도화 | LLM 하이브리드 | $0.02-0.05 | 상 |
| 6 | 면접 Q&A | LLM + 템플릿 | $0.01-0.03 | 상 |
| 7 | 휴머나이저 | LLM | $0.01-0.02 | 중 |
| 8 | 스킬 갭 리포트 | 알고리즘 + LLM(배치) | $0.10/월 | 상 |

---

## 정리 — 판단 기준 요약

```
[방식 선택 결정 트리]

질문이 있다
    │
    ├─ "계산, 매칭, 집계"인가?
    │       → [v] 알고리즘 (빠르고 무료)
    │
    ├─ "구조화된 메시지를 만드는가?"
    │       → [v] 템플릿 (빠르고 무료)
    │
    ├─ "외부 실제 데이터가 필요한가?"
    │       → [v] MCP / 공공 API (실시간 정확)
    │
    ├─ "새로운 자연어 문장 생성이 필요한가?"
    │       → [v] LLM API (단, 경량 모델 우선)
    │
    └─ "개인화된 깊은 분석이 필요한가?"
            → [v] LLM (고성능 모델, 마지막 단계만)
```

---

*작성일: 2026-07-29 | 핵심: 알고리즘이 할 수 있는 것에 LLM을 낭비하지 않는다*
