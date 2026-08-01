// ============================================================
// Kairos Unified Mock Database (src/data/mock/mockup.ts)
// ============================================================

export interface MockUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  walletAddress?: string;
}

export interface MockResume {
  id: string;
  userId: string;
  title: string;
  originalContent: string;
  improvedContent: string;
  status: 'draft' | 'evaluating' | 'improved';
  currentScore: number;
  createdAt: string;
}

export interface MockCareer {
  id: string;
  userId: string;
  company: string;
  role: string;
  period: string;
  description: string;
  similarity?: number;
}

export interface MockInterview {
  id: string;
  userId: string;
  jobTitle: string;
  companyName: string;
  difficulty: 'junior' | 'medium' | 'senior';
  status: 'in_progress' | 'completed';
  overallScore: number | null;
  overallFeedback: string | null;
  createdAt: string;
}

export interface MockMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MockDoc {
  id: string;
  name: string;
  ext: string;
  size: number;
  createdAt: string;
}

export interface MockQA {
  id: string;
  title: string;
  targetRole: string;
  qaPairs: Array<{
    question: string;
    sampleAnswer: string;
    keyPoints: string[];
    difficulty: string;
  }>;
  createdAt: string;
}

export interface MockProfile {
  user: MockUser;
  resumes: MockResume[];
  careers: MockCareer[];
  interviews: MockInterview[];
  interviewChats: Record<string, MockMessage[]>;
  docs: MockDoc[];
  qaSets: MockQA[];
}

const FIRST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '송', '안', '전', '홍'];
const LAST_NAMES = ['민준', '서연', '도윤', '서현', '예준', '수아', '시우', '하은', '하준', '지우', '주원', '지원', '지훈', '윤서', '준우', '채원', '우진', '민서', '건우', '윤아'];

const JOBS = [
  { title: '프론트엔드 개발자', field: 'Frontend', tech: 'React, Next.js, TypeScript, TailwindCSS, Zustand' },
  { title: '백엔드 서버 엔지니어', field: 'Backend', tech: 'Java, Spring Boot, JPA, MySQL, Redis, Kafka' },
  { title: 'AI/ML 연구원', field: 'AI/ML', tech: 'Python, PyTorch, Hugging Face, LangChain, LLM Fine-tuning' },
  { title: 'DevOps 엔지니어', field: 'DevOps', tech: 'Kubernetes, AWS, Terraform, Docker, ArgoCD, Prometheus' },
  { title: 'UX/UI 디자이너', field: 'Design', tech: 'Figma, Adobe XD, ProtoPie, Design System, Framer' },
  { title: '데이터 엔지니어', field: 'Data', tech: 'Spark, Hadoop, Airflow, Snowflake, Python, SQL' },
  { title: 'iOS 개발자', field: 'iOS', tech: 'Swift, SwiftUI, Combine, Alamofire, TCA' },
  { title: '안드로이드 개발자', field: 'Android', tech: 'Kotlin, Jetpack Compose, Coroutines, Flow, Hilt' },
  { title: '프로덕트 매니저 (PM)', field: 'PM/Product', tech: 'Jira, Confluence, GA4, SQL, Slack, Amplitude' },
  { title: '사이버 보안 컨설턴트', field: 'Security', tech: 'SIEM, WAF, Vulnerability Scanning, Metasploit' },
];

const COMPANIES = [
  '토스', '네이버', '카카오', '쿠팡', '라인', '우아한형제들', '당근마켓', '직방', '야놀자', '버킷플레이스',
  '삼성전자', 'SK텔레콤', '무신사', '쏘카', '크래프톤', '넷마블', '엔씨소프트', '비바리퍼블리카', '두나무', '빗썸'
];

function seedRandom(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (h << 5) - h + seedStr.charCodeAt(i);
    h |= 0;
  }
  return () => {
    h = Math.sin(h) * 10000;
    return h - Math.floor(h);
  };
}

export function generateProfiles(): MockProfile[] {
  const profiles: MockProfile[] = [];

  for (let i = 1; i <= 50; i++) {
    const seed = `profile-seed-${i}`;
    const rand = seedRandom(seed);

    const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
    const num = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const name = firstName + lastName;
    const job = pick(JOBS);
    const email = `user${i}@kairos-mock.com`;

    const user: MockUser = {
      id: `mock-user-${i}`,
      name,
      email,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e0e7ff&color=4f46e5&size=64`,
      walletAddress: `0x${Array.from({ length: 40 }, () => '0123456789abcdef'[num(0, 15)]).join('')}`
    };

    const co1 = pick(COMPANIES);
    let co2 = pick(COMPANIES);
    while (co2 === co1) co2 = pick(COMPANIES);

    const careers: MockCareer[] = [
      {
        id: `mock-career-${i}-1`,
        userId: user.id,
        company: co1,
        role: `시니어 ${job.title}`,
        period: '2023.03 ~ 현재',
        description: `${job.tech} 기반 주요 프로덕트의 아키텍처 개선 및 성과 주도. MAU 500만+ 비즈니스 지표 15% 이상 성장 달성.`
      },
      {
        id: `mock-career-${i}-2`,
        userId: user.id,
        company: co2,
        role: `${job.title}`,
        period: '2020.01 ~ 2023.02',
        description: `신규 피처 개발 및 성능 최적화 참여. 로딩 성능 30% 단축 및 컴포넌트 공통화 작업으로 팀 생산성 향상.`
      }
    ];

    const originalContent = `# ${name} - ${job.title} 이력서\n\n## 소개\n${job.title}로써 여러 대형 플랫폼 서비스 개발 및 운영을 성공적으로 수행하였습니다.\n\n## 기술 스택\n${job.tech}\n\n## 경력 사항\n### ${co1} (2023.03 ~ 현재)\n- ${job.title} 팀 내 개발 업무 담당\n- 프로젝트 최적화 및 쿼리 튜닝 진행\n\n### ${co2} (2020.01 ~ 2023.02)\n- 신규 서비스 런칭 참여\n- 프론트/백 백오피스 개발`;

    const improvedContent = `# ${name} | Senior ${job.field} Engineer\n\n## Executive Summary\n대규모 트래픽 및 비즈니스 변화가 빠른 환경에서 ${job.tech}을 바탕으로 고품질 소프트웨어를 배포하는 6년차 개발자. 성능 최적화와 DX 개선에 강점이 있음.\n\n## 주요 성과\n- **${co1}**: API 응답 지연 시간 25% 단축 및 코드 결합도 제거를 통한 신규 피처 배포 속도 2배 개선\n- **${co2}**: 공통 모듈 구축을 통한 코드 재사용률 45% 확보 및 에러 모니터링 구축을 통한 앱 크래시율 0.2% 달성`;

    const resumes: MockResume[] = [
      {
        id: `mock-resume-${i}-1`,
        userId: user.id,
        title: `${job.title} 기본 이력서`,
        originalContent,
        improvedContent,
        status: 'improved',
        currentScore: num(82, 96),
        createdAt: '2026-07-01T00:00:00Z'
      }
    ];

    const interviews: MockInterview[] = [
      {
        id: `mock-interview-${i}-1`,
        userId: user.id,
        jobTitle: job.title,
        companyName: co1,
        difficulty: pick(['junior', 'medium', 'senior']),
        status: 'completed',
        overallScore: num(78, 95),
        overallFeedback: '전반적으로 기술 이해도가 우수하고 요구 스택에 적합한 실무 지식을 가지고 있습니다. 침착하고 수치 기반 성과 설명이 우수합니다.',
        createdAt: '2026-07-10T12:00:00Z'
      }
    ];

    const interviewChats: Record<string, MockMessage[]> = {
      [`mock-interview-${i}-1`]: [
        { role: 'assistant', content: `반갑습니다. ${name}님. ${co1}의 ${job.title} 직무 면접에 지원해주셔서 감사합니다. 먼저 본인의 대표적인 프로젝트 성과에 대해 간략히 소개 부탁드립니다.` },
        { role: 'user', content: `안녕하세요. 저는 ${co1}에서 ${job.tech}을 활용하여 성능 최적화를 주도했습니다. 특히 API 응답 속도를 기존 대비 25% 단축한 경험이 있습니다.` },
        { role: 'assistant', content: `API 성능을 25% 단축한 구체적인 기법은 어떤 것이었나요? 쿼리 튜닝, 캐싱, 혹은 아키텍처상의 레이어 분리였는지 설명해주십시오.` }
      ]
    };

    const docs: MockDoc[] = [
      {
        id: `mock-doc-${i}-1`,
        name: `${name}_포트폴리오.pdf`,
        ext: 'pdf',
        size: num(500000, 3000000),
        createdAt: '2026-07-05T09:00:00Z'
      },
      {
        id: `mock-doc-${i}-2`,
        name: `경력설명서_${co1}.docx`,
        ext: 'docx',
        size: num(150000, 800000),
        createdAt: '2026-07-06T15:00:00Z'
      }
    ];

    const qaSets: MockQA[] = [
      {
        id: `mock-qa-${i}-1`,
        title: `${job.title} 예상 질문 세트`,
        targetRole: job.title,
        createdAt: '2026-07-08T18:00:00Z',
        qaPairs: [
          {
            question: `${job.field} 아키텍처 설계 시 가장 중요하게 생각하는 원칙은 무엇인가요?`,
            sampleAnswer: '단일 책임 원칙(SRP)과 관심사 분리(SoC)를 중요시합니다. 이를 통해 컴포넌트의 결합도를 낮추고 테스트 가능성을 극대화합니다.',
            keyPoints: ['결합도 최소화', '관심사 분리', '테스트 가능성'],
            difficulty: '🌱 주니어'
          },
          {
            question: '성능 튜닝이나 부하 테스트를 진행해 본 실무적 경험이 있습니까?',
            sampleAnswer: '부하 테스트 툴을 활용해 병목 레이어를 찾아내고 Redis 캐싱 또는 데이터베이스 쿼리 최적화를 통해 TPS를 향상시켰습니다.',
            keyPoints: ['병목 현상 발굴', 'Redis 캐싱', '쿼리 최적화'],
            difficulty: '⚡ 미들'
          }
        ]
      }
    ];

    profiles.push({
      user,
      resumes,
      careers,
      interviews,
      interviewChats,
      docs,
      qaSets
    });
  }

  return profiles;
}

export function getSimulatedLLMResponse(message: string, context?: string): { responseText: string; suggestedContent?: string } {
  const lowercaseMsg = message.toLowerCase();

  if (lowercaseMsg.includes('이력서') || lowercaseMsg.includes('자기소개서') || lowercaseMsg.includes('경력')) {
    return {
      responseText: `이력서의 직무 기여도와 성과 지표를 분석한 보완 제안입니다. 주요 기여 내용을 단순 서술형에서 탈피하여 정량적 성과 단위로 구체화했습니다. 아래 Diff 창에서 개선 제안된 상세 내용을 확인하고 즉시 반영하실 수 있습니다.`,
      suggestedContent: (context || '') + `\n\n- [AI 수정제안] 대고객 핵심 결제 모듈 리팩토링 및 쿼리 캐싱 패턴 도입으로 전체 트랜잭션 에러율 0.05% 이하 제어 및 응답속도 LCP 지표 45% 단축 달성.`
    };
  }

  if (lowercaseMsg.includes('스택') || lowercaseMsg.includes('기술')) {
    return {
      responseText: `기술 스택의 깊이를 보여줄 수 있는 프로젝트 문장 구조를 제안해 드립니다. 단순 스택의 나열보다는 해당 기술이 비즈니스 문제를 해결한 과정을 서술하는 것이 훨씬 영향력이 큽니다.`,
      suggestedContent: (context || '') + `\n\n- [AI 수정제안] Next.js 14 App Router 및 Server Component 패턴을 점진적 채택하여 데이터 페칭 아키텍처 단순화 및 초기 TBT(Total Blocking Time) 300ms 감소.`
    };
  }

  return {
    responseText: `질문하신 내용에 대한 보강 추천 피드백을 전달해 드립니다. 프로젝트의 맥락과 구현 과정을 수치로 증명하는 내용을 추가하면 서류 평가와 면접에서 더욱 유리한 피드백을 받을 수 있습니다.`,
    suggestedContent: (context || '') + `\n\n- [AI 수정제안] 클라우드 인프라 자원의 프로비저닝 자동화(IaC, Terraform) 기법을 설계하여 아키텍처 일관성 유지 및 리소스 유휴 비용 20% 최적화.`
  };
}
