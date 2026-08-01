/**
 * Humanizer service ported from server/services/humanizer.ts
 */
import { z } from 'zod';
import { callLLMStructured } from './llm';

const humanizerSchema = z.object({
  humanizedText: z.string(),
  styleScore: z.number().min(0).max(100),
  changesSummary: z.string(),
  removedClichés: z.array(z.string()),
});

export type HumanizedResult = z.infer<typeof humanizerSchema>;

export async function processAIHumanizer(originalText: string): Promise<HumanizedResult> {
  const instructions = `You are the Kairos AI Humanizer module. Your task is to transform AI-generated or overly robotic Korean job application text into natural, persuasive, human-written professional language.
Remove repetitive patterns (e.g., 과도한 'through', '관점', '~함에 있어', 진부한 비유), fix passive voice, and ensure authentic human tone while preserving all facts.`;

  return await callLLMStructured<HumanizedResult>({
    instructions,
    prompt: `Transform the following text into natural human Korean:\n\n${originalText}`,
    schema: humanizerSchema,
    temperature: 0.5,
  });
}
