import { z } from 'zod';
import { callLLMStructured, isDemoMode } from './llm';

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

const DEMO_QA_SET: QASetResult = {
  title: '시니어 풀스택 개발자 예상 면접 Q&A 세트',
  targetRole: '시니어 풀스택 개발자',
  qaPairs: [
    {
      question: '대규모 트래픽 상황에서 성능 병목을 어떻게 진단하고 해결한 경험이 있으신가요?',
      questionCategory: 'technical',
      sampleAnswer: '이전 프로젝트에서 DAU 50만의 서비스에서 API 응답 속도가 3초를 초과하는 문제가 발생했습니다. DataDog APM으로 병목을 추적한 결과 N+1 쿼리 문제를 발견했고, Drizzle ORM의 eager loading 및 Redis 캐싱을 도입해 평균 응답 시간을 280ms로 단축했습니다.',
      keyPoints: ['APM 도구 활용', 'N+1 쿼리 진단', '캐싱 레이어 도입', '수치 기반 성과 제시'],
      difficulty: 'hard',
    },
    {
      question: 'RESTful API 설계 원칙을 설명하고, 실제 프로젝트에서 어떻게 적용했는지 말씀해주세요.',
      questionCategory: 'technical',
      sampleAnswer: 'REST 원칙의 핵심은 Stateless, Resource 중심 URI, HTTP 메서드 의미론적 사용입니다. 저는 Nuxt 4의 Nitro 서버에서 이력서/면접/경력 리소스를 명사형 복수로 설계하고, HATEOAS 링크와 표준 HTTP 상태 코드를 준수해 클라이언트 개발자의 onboarding 시간을 40% 단축했습니다.',
      keyPoints: ['Stateless 원칙', 'URI 설계', 'HTTP 메서드', '실제 사례 연결'],
      difficulty: 'medium',
    },
    {
      question: '팀원과 기술적 의견 충돌이 발생했을 때 어떻게 해결했나요?',
      questionCategory: 'behavioral',
      sampleAnswer: '마이크로서비스 도입 여부를 놓고 시니어 개발자와 의견이 달랐습니다. 저는 감정보다 데이터를 중심으로 접근해 현재 트래픽 규모, 팀 역량, 운영 비용을 스프레드시트로 비교 분석한 자료를 준비했고, 단계적 전환 로드맵을 제안해 합의를 이끌었습니다.',
      keyPoints: ['데이터 기반 설득', '갈등 해소 프로세스', '팀 협업 중심'],
      difficulty: 'medium',
    },
    {
      question: 'pgvector와 시맨틱 검색을 실제 서비스에 어떻게 적용할 수 있을지 설명해주세요.',
      questionCategory: 'technical',
      sampleAnswer: 'pgvector는 PostgreSQL에서 고차원 벡터 연산을 지원하는 확장 모듈입니다. 텍스트를 OpenAI text-embedding-3-small로 1536차원 벡터로 변환하고, HNSW 인덱스를 생성해 코사인 유사도 기반의 시맨틱 검색을 구현합니다. Kairos 프로젝트에서는 경력 사항 데이터를 벡터화해 "백엔드 경험"을 검색하면 "서버 개발", "Node.js 프로젝트" 등 의미상 유사한 결과를 반환합니다.',
      keyPoints: ['벡터 임베딩 개념', 'HNSW 인덱스', '코사인 유사도', '실제 적용 사례'],
      difficulty: 'hard',
    },
    {
      question: '입사 후 첫 3개월 안에 어떤 성과를 내고 싶으신가요?',
      questionCategory: 'culture-fit',
      sampleAnswer: '첫 달은 코드베이스와 팀 문화를 깊이 이해하는 데 집중하겠습니다. 두 번째 달부터는 소규모 기능 개발과 버그 수정으로 실질적 기여를 시작하고, 세 번째 달에는 성능 병목이나 기술 부채를 분석해 개선 제안서를 제출하는 것을 목표로 합니다.',
      keyPoints: ['온보딩 전략', '단계적 목표 설정', '기여 의지 표현'],
      difficulty: 'easy',
    },
  ],
};

// Single function = Single LLM call (Generate Q&A Set)
export async function generateQASet(targetRole: string, careerSummary: string, count: number = 5): Promise<QASetResult> {
  if (isDemoMode()) {
    console.info('[Kairos Demo] Q&A 생성 - 데모 모드 응답 반환');
    return { ...DEMO_QA_SET, targetRole, title: `${targetRole} 예상 면접 Q&A 세트` };
  }

  const systemPrompt = `You are a interview prep expert at Kairos. Generate tailored high-probability interview questions and stellar model answers based on candidate background and target role. Respond in Korean.`;

  return await callLLMStructured<QASetResult>({
    system: systemPrompt,
    prompt: `Target Role: ${targetRole}\nNumber of Questions: ${count}\n\nCandidate Background / Career Summary:\n${careerSummary}`,
    schema: qaSetSchema,
    temperature: 0.6,
  });
}

