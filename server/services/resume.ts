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

