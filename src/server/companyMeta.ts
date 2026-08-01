import { callLLMStructured } from './llm';
import { z } from 'zod';

const companyAnalysisSchema = z.object({
  companyName: z.string(),
  industry: z.string(),
  wlbScore: z.number().min(0).max(100),
  cultureScore: z.number().min(0).max(100),
  salaryScore: z.number().min(0).max(100),
  prosSummary: z.array(z.string()),
  consSummary: z.array(z.string()),
  realTruthVsJobAd: z.string(),
  aiStrategyAdvice: z.string(),
});

export type CompanyMetaAnalysis = z.infer<typeof companyAnalysisSchema>;

export async function analyzeCompanyMetaInfo(companyName: string, rawReviews: string = ''): Promise<CompanyMetaAnalysis> {
  const instructions = `You are Kairos Meta Intelligence Agent.
Analyze the target company by cross-referencing public employee reviews, Reddit discussion threads, and job posting data.
Provide an objective evaluation of WLB, culture, salary, pros/cons, and the REAL truth behind their job postings. Respond in Korean.`;

  const prompt = `Target Company: ${companyName}\nRaw Community & Review Mentions:\n${rawReviews || 'N/A'}`;

  return await callLLMStructured<CompanyMetaAnalysis>({
    instructions,
    prompt,
    schema: companyAnalysisSchema,
    temperature: 0.3,
  });
}
