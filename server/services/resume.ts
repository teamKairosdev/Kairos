import { z } from 'zod';
import { callLLMStructured } from './llm';
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



import { checkInputGuardrail, checkOutputAsyncGuardrail } from './guardrail';

// Single function = Single LLM call (Evaluate Draft)
export async function evaluateResumeDraft(draftContent: string): Promise<ResumeEvaluation> {
  const inputGuard = checkInputGuardrail(draftContent);
  if (!inputGuard.passed) {
    throw new Error(`Guardrail Violation (Layer 1): ${inputGuard.reason}`);
  }

  const instructions = `You are a world-class executive recruiter and resume evaluator.
Analyze the candidate's resume draft thoroughly and provide objective metrics, strengths, weaknesses, and clear actionable suggestions. Respond in Korean.`;

  const evalResult = await callLLMStructured<ResumeEvaluation>({
    instructions,
    prompt: `Analyze the following resume draft:\n\n${draftContent}`,
    schema: evaluationSchema,
    temperature: 0.3,
  });

  return evalResult;
}

// Single function = Single LLM call (Improve Resume)
export async function generateImprovedResume(draftContent: string, evaluation: ResumeEvaluation) {
  const instructions = `You are an elite career steward and resume rewriting specialist (Kairos).
Rewrite the candidate's resume applying the STAR method (Situation, Task, Action, Result), dynamic action verbs, quantified achievements, and professional tone. Respond in Korean.`;

  const prompt = `Original Draft:\n${draftContent}\n\nEvaluation Feedback:\nStrengths: ${evaluation.strengths.join(', ')}\nWeaknesses: ${evaluation.weaknesses.join(', ')}\nSuggestions: ${evaluation.suggestions.join(', ')}\n\nRewrite this resume to maximize professional impact.`;

  const res = await callLLMStructured<{ improvedContent: string; keyChanges: string[]; estimatedNewScore: number }>({
    instructions,
    prompt,
    schema: improvedResumeSchema,
    temperature: 0.4,
  });

  const outputGuard = checkOutputAsyncGuardrail(res.improvedContent);
  if (!outputGuard.passed && outputGuard.sanitizedContent) {
    res.improvedContent = outputGuard.sanitizedContent;
  }

  return res;
}

// Async Refinement Pipeline Chain (Draft -> Evaluate -> Improve)
export async function executeResumeRefinementChain(resumeId: string) {
  const db = getDb();
  if (!db) throw new Error('Database not available');

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

