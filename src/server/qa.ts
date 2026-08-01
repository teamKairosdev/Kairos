/**
 * QA service ported from server/services/qa.ts
 */
import { z } from 'zod';
import { callLLMStructured } from './llm';

const qaPairSchema = z.object({
  question: z.string(),
  questionCategory: z.enum(['technical', 'behavioral', 'situational', 'culture-fit']),
  sampleAnswer: z.string(),
  keyPoints: z.array(z.string()),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

const qaSetSchema = z.object({
  title: z.string(),
  targetRole: z.string(),
  qaPairs: z.array(qaPairSchema),
});

export type QASetResult = z.infer<typeof qaSetSchema>;

export async function generateQASet(
  targetRole: string,
  careerSummary: string,
  count = 5
): Promise<QASetResult> {
  const instructions = `You are a interview prep expert at Kairos. Generate tailored high-probability interview questions and stellar model answers based on candidate background and target role. Respond in Korean.`;

  return await callLLMStructured<QASetResult>({
    instructions,
    prompt: `Target Role: ${targetRole}\nNumber of Questions: ${count}\n\nCandidate Background / Career Summary:\n${careerSummary}`,
    schema: qaSetSchema,
    temperature: 0.6,
  });
}
