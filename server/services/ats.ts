import { z } from 'zod';
import { callLLMStructured } from './llm';

const atsAnalysisSchema = z.object({
  matchScore: z.number().min(0).max(100),
  foundKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  recommendations: z.array(z.string()),
  detailedBreakdown: z.object({
    skillsScore: z.number().min(0).max(100),
    experienceScore: z.number().min(0).max(100),
    educationScore: z.number().min(0).max(100),
    keywordDensityScore: z.number().min(0).max(100),
  }),
});

export type ATSAnalysisResult = z.infer<typeof atsAnalysisSchema>;

// Single function = Single LLM call (ATS Analysis)
export async function analyzeATSCompatibility(resumeText: string, jobDescription: string): Promise<ATSAnalysisResult> {
  const instructions = `You are an automated Applicant Tracking System (ATS) matching algorithm engine and recruiter AI at Kairos.
Evaluate the candidate's resume against the target job description. Identify exact keyword matches, missing critical skills/technologies, keyword density, and overall match score. Respond in Korean.`;

  return await callLLMStructured<ATSAnalysisResult>({
    instructions,
    prompt: `Job Description:\n${jobDescription}\n\nCandidate Resume:\n${resumeText}`,
    schema: atsAnalysisSchema,
    temperature: 0.2,
  });
}

