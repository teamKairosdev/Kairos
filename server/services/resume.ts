import { z } from 'zod';
import { callLLMStructured, isDemoMode } from './llm';
import { getDb } from '../../db/index';
import { resumes, resumeRefinements } from '../../db/schema';
import { eq } from 'drizzle-orm';

const evaluationSchema = z.object({
  score: z.number().min(0).max(100),
  clarityScore: z.number().min(0).max(100),
  impactScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export type ResumeEvaluation = z.infer<typeof evaluationSchema>;

const improvedResumeSchema = z.object({
  improvedContent: z.string(),
  keyChanges: z.array(z.string()),
  estimatedNewScore: z.number().min(0).max(100),
});

const compareSchema = z.object({
  commonStrengths: z.array(z.string()),
  uniqueToFirst: z.array(z.string()),
  uniqueToSecond: z.array(z.string()),
  firstImprovements: z.array(z.string()),
  secondImprovements: z.array(z.string()),
  summary: z.string(),
});

const mergeSchema = z.object({
  mergedContent: z.string(),
  keyChanges: z.array(z.string()),
  sourcesUsed: z.array(z.string()),
  estimatedScore: z.number().min(0).max(100),
});

const DEMO_COMPARE = {
  commonStrengths: ['두 이력서 모두 기술 스택이 잘 정리되어 있습니다.', '프로젝트 경험이 구체적으로 서술되어 있습니다.'],
  uniqueToFirst: ['AI/ML 관련 경험이 더 상세합니다.', '오픈소스 기여 경력이 포함되어 있습니다.'],
  uniqueToSecond: ['DevOps 및 인프라 경험이 더 풍부합니다.', '대규모 트래픽 처리 경험이 명시되어 있습니다.'],
  firstImprovements: ['Docker/K8s 경험을 추가하면 좋습니다.', '성과 수치를 더 구체적으로 기재하세요.'],
  secondImprovements: ['AI/ML 경험을 보강하는 것이 좋습니다.', '프로젝트 기간을 명시하세요.'],
  summary: '첫 번째 이력서는 AI/ML에 강점이 있고, 두 번째는 DevOps/인프라에 강점이 있습니다. 두 이력서의 장점을 결합하면 매우 강력한 이력서가 완성됩니다.',
};

const DEMO_MERGE = {
  mergedContent: `## 경력 사항

**Kairos Labs | 시니어 풀스택 엔지니어** (2023.01 - 현재)
- Nuxt 4 + TypeScript 기반 AI 취업 준비 플랫폼 전체 아키텍처 설계 및 구현, MAU 2만 달성
- pgvector 기반 시맨틱 검색 엔진 도입으로 검색 정확도 38% 향상
- Docker/Kubernetes 기반 CI/CD 파이프라인 구축으로 배포 시간 70% 단축
- 대규모 트래픽 처리 시스템 설계로 초당 1만 요청 처리`,
  keyChanges: ['AI/ML 경험과 DevOps 경험을 통합했습니다.', '성과 수치를 구체적으로 기재했습니다.', '불필요한 중복 내용을 제거하고 압축했습니다.'],
  sourcesUsed: ['첫 번째 이력서의 AI/ML 프로젝트 경험', '두 번째 이력서의 Docker/K8s 인프라 경험'],
  estimatedScore: 96,
};

export async function compareResumes(content1: string, content2: string) {
  if (isDemoMode()) {
    console.info('[Kairos Demo] 이력서 비교 - 데모 모드 응답 반환');
    return DEMO_COMPARE;
  }
  const instructions = 'You are a professional resume comparison expert. Compare two resumes and identify unique strengths, commonalities, and improvement opportunities. Respond in Korean.';
  const prompt = `[첫 번째 이력서]\n${content1}\n\n[두 번째 이력서]\n${content2}\n\n위 두 이력서를 비교 분석해 주세요.`;
  return await callLLMStructured({ instructions, prompt, schema: compareSchema, temperature: 0.3 });
}

export async function mergeResumes(content1: string, content2: string) {
  if (isDemoMode()) {
    console.info('[Kairos Demo] 이력서 병합 - 데모 모드 응답 반환');
    return DEMO_MERGE;
  }
  const instructions = 'You are a professional resume writer. Merge two resumes into one superior version by combining their best elements. Respond in Korean.';
  const prompt = `[첫 번째 이력서]\n${content1}\n\n[두 번째 이력서]\n${content2}\n\n두 이력서의 장점을 결합한 최상의 이력서를 만들어 주세요.`;
  return await callLLMStructured({ instructions, prompt, schema: mergeSchema, temperature: 0.3 });
}

const DEMO_EVALUATION: ResumeEvaluation = {
  score: 68,
  clarityScore: 72,
  impactScore: 61,
  strengths: ['기술 스택이 명확하게 나열되어 있습니다.', '프로젝트 경험이 다양합니다.', '팀 협업 경험이 언급되어 있습니다.'],
  weaknesses: ['성과 수치가 빠져 있습니다.', 'STAR 형식이 일관되지 않습니다.', '직무 연관성이 낮은 경험이 포함되어 있습니다.'],
  suggestions: [
    '모든 경험에 수치형 성과(%, ms, 건 등)를 추가하세요.',
    '불필요한 잡무 내용은 삭제하고 임팩트 있는 프로젝트 위주로 압축하세요.',
    'Action Verb(설계, 구축, 최적화 등)로 문장을 시작하세요.',
  ],
};

const DEMO_IMPROVED = {
  improvedContent: `## 경력 사항

**Kairos Labs | 시니어 풀스택 엔지니어** (2023.01 – 현재)
- Nuxt 4 + TypeScript 기반 AI 취업 준비 플랫폼 전체 아키텍처 설계 및 구현, MAU 2만 달성
- pgvector 기반 시맨틱 검색 엔진 도입으로 검색 정확도 38% 향상
- Vercel AI SDK 멀티 프로바이더 Fallback 체인 구축으로 LLM 가용성 99.9% 확보
- Drizzle ORM + PostgreSQL 쿼리 최적화로 API 응답 시간 420ms → 95ms로 단축`,
  keyChanges: [
    '각 경험에 수치형 성과 지표 추가 (MAU, %, ms)',
    'STAR 형식으로 전면 재구성',
    '불필요한 서술형 표현 제거 및 Action Verb 중심으로 재작성',
  ],
  estimatedNewScore: 94,
};

// Single function = Single LLM call (Evaluate Draft)
export async function evaluateResumeDraft(draftContent: string): Promise<ResumeEvaluation> {
  if (isDemoMode()) {
    console.info('[Kairos Demo] 이력서 평가 - 데모 모드 응답 반환');
    return DEMO_EVALUATION;
  }

  const instructions = `You are a world-class executive recruiter and resume evaluator.
Analyze the candidate's resume draft thoroughly and provide objective metrics, strengths, weaknesses, and clear actionable suggestions. Respond in Korean.`;

  return await callLLMStructured<ResumeEvaluation>({
    instructions,
    prompt: `Analyze the following resume draft:\n\n${draftContent}`,
    schema: evaluationSchema,
    temperature: 0.3,
  });
}

// Single function = Single LLM call (Improve Resume)
export async function generateImprovedResume(draftContent: string, evaluation: ResumeEvaluation) {
  if (isDemoMode()) {
    console.info('[Kairos Demo] 이력서 개선 - 데모 모드 응답 반환');
    return DEMO_IMPROVED;
  }

  const instructions = `You are an elite career steward and resume rewriting specialist (Kairos).
Rewrite the candidate's resume applying the STAR method (Situation, Task, Action, Result), dynamic action verbs, quantified achievements, and professional tone. Respond in Korean.`;

  const prompt = `Original Draft:\n${draftContent}\n\nEvaluation Feedback:\nStrengths: ${evaluation.strengths.join(', ')}\nWeaknesses: ${evaluation.weaknesses.join(', ')}\nSuggestions: ${evaluation.suggestions.join(', ')}\n\nRewrite this resume to maximize professional impact.`;

  return await callLLMStructured<{ improvedContent: string; keyChanges: string[]; estimatedNewScore: number }>({
    instructions,
    prompt,
    schema: improvedResumeSchema,
    temperature: 0.4,
  });
}

// Async Refinement Pipeline Chain (Draft -> Evaluate -> Improve)
export async function executeResumeRefinementChain(resumeId: string) {
  const db = getDb();
  if (!db) {
    // Demo mode: return mock refinement result without DB
    console.info('[Kairos Demo] 이력서 고도화 - 데모 모드 실행');
    const evaluation = DEMO_EVALUATION;
    const improvedResult = DEMO_IMPROVED;
    return { evaluation, improvedResult };
  }

  const [existing] = await db.select().from(resumes).where(eq(resumes.id, resumeId));
  if (!existing) throw new Error('Resume not found');

  // Step 1: Mark as evaluating
  await db.update(resumes).set({ status: 'evaluating' }).where(eq(resumes.id, resumeId));

  // Step 2: Evaluate LLM call
  const evaluation = await evaluateResumeDraft(existing.originalContent);

  await db.insert(resumeRefinements).values({
    resumeId,
    step: 'evaluate',
    draftContent: existing.originalContent,
    evaluationFeedback: evaluation,
    score: evaluation.score,
  });

  // Step 3: Improve LLM call
  const improvedResult = await generateImprovedResume(existing.originalContent, evaluation);

  await db.insert(resumeRefinements).values({
    resumeId,
    step: 'improve',
    draftContent: existing.originalContent,
    evaluationFeedback: evaluation,
    score: improvedResult.estimatedNewScore,
    improvedContent: improvedResult.improvedContent,
  });

  // Step 4: Update final resume state
  await db.update(resumes).set({
    status: 'improved',
    currentScore: improvedResult.estimatedNewScore,
    updatedAt: new Date(),
  }).where(eq(resumes.id, resumeId));

  return { evaluation, improvedResult };
}

