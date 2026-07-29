import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { callLLMStructured, isDemoMode } from 'server/services/llm';
import { getDb } from 'db';
import { companies } from 'db/schema';

const companyEvalSchema = z.object({
  matchScore: z.number().min(0).max(100),
  breakdown: z.object({
    techFit: z.number().min(0).max(100),
    cultureFit: z.number().min(0).max(100),
    experienceFit: z.number().min(0).max(100),
    overallFit: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  recommendations: z.array(z.string()),
  aiSummary: z.string(),
});

export type CompanyEvalResult = z.infer<typeof companyEvalSchema>;

export async function getCompanyById(id: string) {
  const db = getDb();
  if (!db) return null;
  const [company] = await db.select().from(companies).where(eq(companies.id, id));
  return company || null;
}

export async function evaluateResumeForCompany(
  resumeContent: string,
  companyId: string
): Promise<CompanyEvalResult> {
  if (isDemoMode()) {
    console.info('[Kairos Demo] 기업 맞춤 평가 - 데모 모드 응답 반환');
    return DEMO_COMPANY_EVAL;
  }

  const db = getDb();
  let companyData: any = null;
  if (db) {
    companyData = await getCompanyById(companyId);
  }

  if (!companyData) {
    return DEMO_COMPANY_EVAL;
  }

  const companyProfile = `
기업명: ${companyData.name}
산업: ${companyData.industry}
기업 규모: ${companyData.size || '정보 없음'}
위치: ${companyData.location || '정보 없음'}
기술 스택: ${companyData.techStack ? (companyData.techStack as string[]).join(', ') : '정보 없음'}
문화/가치관: ${companyData.cultureKeywords ? (companyData.cultureKeywords as string[]).join(', ') : '정보 없음'}
채용 기준:
  - 기술: ${companyData.hiringCriteria?.technical ? (companyData.hiringCriteria.technical as string[]).join(', ') : '정보 없음'}
  - 소프트 스킬: ${companyData.hiringCriteria?.soft ? (companyData.hiringCriteria.soft as string[]).join(', ') : '정보 없음'}
  - 가치관: ${companyData.hiringCriteria?.values ? (companyData.hiringCriteria.values as string[]).join(', ') : '정보 없음'}
이상적인 인재상: ${companyData.idealCandidate || '정보 없음'}
`;

  const instructions = `You are a specialized hiring consultant for the above company.
Analyze the candidate's resume against this specific company's profile, tech stack, culture, and hiring criteria.
Provide a detailed fit analysis in Korean. Be honest and constructive.`;

  const prompt = `[회사 프로필]\n${companyProfile}\n\n[지원자 이력서]\n${resumeContent}\n\n위 이력서가 해당 기업에 얼마나 적합한지 분석해 주세요.`;

  return await callLLMStructured<CompanyEvalResult>({
    instructions,
    prompt,
    schema: companyEvalSchema,
    temperature: 0.3,
  });
}

const DEMO_COMPANY_EVAL: CompanyEvalResult = {
  matchScore: 78,
  breakdown: {
    techFit: 82,
    cultureFit: 70,
    experienceFit: 75,
    overallFit: 78,
  },
  strengths: [
    'TypeScript + Nuxt.js 경험이 기업의 메인 스택과 100% 일치합니다.',
    '대규모 프로젝트 리딩 경험이 있으며, 이는 해당 기업의 시니어 포지션 요구사항에 부합합니다.',
    'AI/ML 관련 프로젝트 경험이 기업의 AI 사업 방향성과 잘 맞습니다.',
  ],
  gaps: [
    '해당 기업이 중요시하는 Docker/K8s 경험이 이력서에 명시되지 않았습니다.',
    '스타트업 경험이 없어 빠른 환경 적응에 대한 우려가 있습니다.',
    '영어 커뮤니케이션 능력에 대한 언급이 없습니다 (해당 기업은 글로벌 협업 필요).',
  ],
  recommendations: [
    'Docker 및 Kubernetes 관련 경험을 구체적인 프로젝트 예시와 함께 추가하세요.',
    '스타트업/초기 프로젝트 경험이 있다면 강조하고, 없다면 빠른 적응력을 어필하세요.',
    'TOEIC/OPIC 점수나 영어 사용 프로젝트 경험을 기재하세요.',
    '기업의 기술 블로그를 참고하여 사용 중인 특정 기술에 대한 경험을 언급하세요.',
  ],
  aiSummary: '해당 이력서는 기업의 기술 스택과 상당히 일치하나, DevOps 역량과 글로벌 커뮤니케이션 부분에서 보강이 필요합니다. 전체적으로 78%의 기업 적합도를 보이며, 몇 가지 핵심 보완만으로도 높은 매칭률 달성이 가능합니다.',
};
