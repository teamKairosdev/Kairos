import { getDb } from 'db';
import { companies } from 'db/schema';
import { desc } from 'drizzle-orm';

const MOCK_COMPANIES = [
  {
    id: 'demo-company-kakao',
    name: '카카오',
    description: '국내 대표 IT 플랫폼 기업. 카카오톡, 카카오페이 등 다양한 서비스 운영.',
    industry: 'IT/플랫폼',
    size: 'large',
    location: '제주/판교',
    techStack: ['Java', 'Kotlin', 'Spring', 'Kubernetes', 'MySQL', 'Kafka'],
    cultureKeywords: ['수평적 문화', '자율성', '창의성', '사용자 중심'],
    hiringCriteria: { technical: ['백엔드', '대규모 트래픽', 'MSA'], soft: ['협업', '의사소통'], values: ['사용자 가치'] },
    idealCandidate: '사용자 가치를 최우선으로 생각하고, 대규모 트래픽을 처리할 수 있는 엔지니어',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-company-naver',
    name: '네이버',
    description: '국내 최대 검색 포털 및 AI 기술 선도 기업.',
    industry: 'IT/검색/AI',
    size: 'large',
    location: '판교/춘천',
    techStack: ['Java', 'Spring', 'React', 'Vue', 'MongoDB', 'Redis', 'Docker'],
    cultureKeywords: ['기술 중심', '도전', '혁신', '데이터 기반'],
    hiringCriteria: { technical: ['알고리즘', '시스템 설계', '데이터 처리'], soft: ['문제 해결', '자기 주도'], values: ['기술 혁신'] },
    idealCandidate: '기술적 도전을 즐기고 데이터 기반 의사결정을 하는 개발자',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-company-coupang',
    name: '쿠팡',
    description: '국내 1위 이커머스 기업. 물류/테크 융합 혁신.',
    industry: '이커머스/물류',
    size: 'large',
    location: '서울/대구',
    techStack: ['Java', 'Spring Boot', 'AWS', 'DynamoDB', 'Kafka', 'React'],
    cultureKeywords: ['빠른 실행', '고객 집착', '데이터 중심', '소유 의식'],
    hiringCriteria: { technical: ['대규모 시스템', 'MSA', '클라우드'], soft: ['리더십', '오너십'], values: ['고객 가치'] },
    idealCandidate: '고객 경험을 최우선으로 하고 강한 오너십을 가진 엔지니어',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-company-toss',
    name: '토스',
    description: '모바일 금융 혁신 플랫폼. 간편결제 및 금융 슈퍼앱.',
    industry: '핀테크',
    size: 'medium',
    location: '서울 강남',
    techStack: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Kubernetes'],
    cultureKeywords: ['수평적', '투명성', '도전', '소유감'],
    hiringCriteria: { technical: ['프론트엔드', 'API 설계', '테스트 자동화'], soft: ['자기 주도', '소통'], values: ['투명함', '도전'] },
    idealCandidate: '금융 기술에 관심이 많고 뛰어난 소유감과 도전 정신을 가진 개발자',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-company-line',
    name: '라인 (LINE)',
    description: '글로벌 메신저 및 핀테크 플랫폼 기업.',
    industry: 'IT/글로벌',
    size: 'large',
    location: '분당/도쿄',
    techStack: ['Java', 'Go', 'Vue.js', 'Flutter', 'MySQL', 'Redis'],
    cultureKeywords: ['글로벌 마인드', '협업', '혁신', '다양성'],
    hiringCriteria: { technical: ['백엔드', '모바일', '분산 시스템'], soft: ['글로벌 커뮤니케이션', '협업'], values: ['글로벌 가치'] },
    idealCandidate: '글로벌 환경에서 협업할 수 있고 분산 시스템에 강한 엔지니어',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-company-baedal',
    name: '배달의민족 (우아한형제들)',
    description: '국내 1위 음식 배달 플랫폼. 기술 중심 조직 문화.',
    industry: 'IT/플랫폼',
    size: 'medium',
    location: '서울 송파/부산',
    techStack: ['Java', 'Kotlin', 'Spring Boot', 'JPA', 'AWS', 'Docker'],
    cultureKeywords: ['우아함', '기술 존중', '워라밸', '자율'],
    hiringCriteria: { technical: ['Spring', 'JPA', 'MSA', '클라우드'], soft: ['코드 리뷰 문화', '문서화'], values: ['기술적 우아함'] },
    idealCandidate: '클린 코드와 기술적 우아함을 추구하며 자율적으로 일하는 개발자',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default defineEventHandler(async () => {
  try {
    const db = getDb();
    if (db) {
      const list = await db.select().from(companies).orderBy(desc(companies.createdAt));
      if (list.length > 0) return list;
    }
  } catch {
    console.warn('[Kairos] companies/index.get.ts DB fetch failed (demo mode)');
  }
  return MOCK_COMPANIES;
});
