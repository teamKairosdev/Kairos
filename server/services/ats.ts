import { z } from 'zod';
import { callLLMStructured, isDemoMode } from './llm';

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

const DEMO_ATS_RESULT: ATSAnalysisResult = {
  matchScore: 78,
  foundKeywords: ['TypeScript', 'Nuxt.js', 'Vue.js', 'Node.js', 'PostgreSQL', 'REST API', 'SSR'],
  missingKeywords: ['GraphQL', 'Docker', 'CI/CD', 'AWS', 'Kubernetes'],
  recommendations: [
    'GraphQL 및 REST API 설계 경험을 이력서에 명시적으로 추가하세요.',
    'Docker 및 CI/CD 파이프라인 구축 경험을 구체적인 수치와 함께 기술하세요.',
    'AWS 또는 클라우드 서비스 활용 사례를 추가하면 ATS 통과율이 약 15% 향상됩니다.',
    '성과 지표(KPI)를 수치로 표현하면 키워드 밀도 점수가 개선됩니다.',
  ],
  detailedBreakdown: { skillsScore: 82, experienceScore: 75, educationScore: 88, keywordDensityScore: 65 },
};

// Single function = Single LLM call (ATS Analysis)
export async function analyzeATSCompatibility(resumeText: string, jobDescription: string): Promise<ATSAnalysisResult> {
  if (isDemoMode()) {
    console.info('[Kairos Demo] ATS 분석 - 데모 모드 응답 반환');
    return DEMO_ATS_RESULT;
  }

  const systemPrompt = `You are an automated Applicant Tracking System (ATS) matching algorithm engine and recruiter AI at Kairos.
Evaluate the candidate's resume against the target job description. Identify exact keyword matches, missing critical skills/technologies, keyword density, and overall match score. Respond in Korean.`;

  return await callLLMStructured<ATSAnalysisResult>({
    system: systemPrompt,
    prompt: `Job Description:\n${jobDescription}\n\nCandidate Resume:\n${resumeText}`,
    schema: atsAnalysisSchema,
    temperature: 0.2,
  });
}

