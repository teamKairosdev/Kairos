import { z } from 'zod';
import { callLLMStructured } from './llm';

const skillGapSchema = z.object({
  region: z.string(),
  targetMajor: z.string(),
  requiredSkillsTop10: z.array(z.string()),
  possessedSkillsTop10: z.array(z.string()),
  criticalGapSkills: z.array(z.object({
    skill: z.string(),
    gapRatioPercent: z.number(),
    demandGrowth: z.string(),
  })),
  aiPolicyInsight: z.string(),
});

export type SkillGapData = z.infer<typeof skillGapSchema>;

export async function getPublicSkillGapReport(region: string = '경기도'): Promise<SkillGapData> {
  return await callLLMStructured<SkillGapData>({
    instructions: `You are Kairos Public Benefit Youth Employment Analytics Engine.
Analyze the current youth employment skill gap trends for the given region.
Identify top 10 in-demand skills, top 10 possessed skills, critical gap areas with demand growth rate, and a policy insight.
Respond in Korean.`,
    prompt: `Generate a detailed youth skill gap analysis for region: ${region}`,
    schema: skillGapSchema,
    temperature: 0.4,
  });
}
