import { callLLMStructured, isDemoMode } from './llm';
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

const DEMO_COMPANY_META: CompanyMetaAnalysis = {
  companyName: '테크 카카오 (Demo Target)',
  industry: 'IT / 플랫폼 서비스',
  wlbScore: 88,
  cultureScore: 92,
  salaryScore: 85,
  prosSummary: [
    '자유로운 리모트 워크 및 든든한 복지 혜택',
    '뛰어난 동료들과의 기술 성장 및 코드 리뷰 문화',
    '수평적 커뮤니케이션과 주도적 업무 할당',
  ],
  consSummary: [
    '조직 재편 시 부서 이동 변동성 존재',
    '프로젝트 단위 의사결정 속도가 다소 느림',
  ],
  realTruthVsJobAd: '공고의 "글로벌 비즈니스"는 해외 자회사 통신 API 연동 중심이며, 실질적으로는 국내 트래픽 대용량 분산처리가 메인 과제임.',
  aiStrategyAdvice: '면접 시 대용량 분산 큐(Kafka/Redis) 트래픽 처리 경험과 기술 블로그 기록을 강조할 것.',
};

export async function analyzeCompanyMetaInfo(companyName: string, rawReviews: string = ''): Promise<CompanyMetaAnalysis> {
  if (isDemoMode()) {
    console.info(`[Kairos Demo] 기업 메타 분석 (${companyName}) - 데모 데이터 반환`);
    return { ...DEMO_COMPANY_META, companyName };
  }

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
