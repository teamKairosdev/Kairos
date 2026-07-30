/**
 * Kairos Model Context Protocol (MCP) Hub & Connector Service
 */

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPPublicPosting {
  id: string;
  source: 'worknet' | 'goyong24' | 'hrdkorea';
  title: string;
  company: string;
  location: string;
  salaryInfo: string;
  closeDate: string;
  detailUrl: string;
}

const DEMO_PUBLIC_POSTINGS: MCPPublicPosting[] = [
  {
    id: 'wn-2026-001',
    source: 'worknet',
    title: '[고용노동부 우수] 클라우드 인프라 파이프라인 개발자 채용',
    company: '(주)한국클라우드시스템',
    location: '경기도 성남시 분당구',
    salaryInfo: '연봉 5,000만원 ~ 6,500만원',
    closeDate: '2026-08-31',
    detailUrl: 'https://www.work.go.kr',
  },
  {
    id: 'gy-2026-042',
    source: 'goyong24',
    title: '청년 일자리 도약 사업 - AI 서비스 프론트엔드 엔지니어',
    company: '(주)카이로스랩스',
    location: '서울특별시 강남구',
    salaryInfo: '연봉 4,800만원 ~ 6,000만원',
    closeDate: '2026-08-15',
    detailUrl: 'https://www.goyong24.go.kr',
  },
];

export async function searchPublicJobPostings(query: string): Promise<MCPPublicPosting[]> {
  console.info(`[Kairos MCP Hub] Searching WorkNet & Goyong24 for query: "${query}"`);
  // Filters public postings by query keywords
  if (!query) return DEMO_PUBLIC_POSTINGS;
  const q = query.toLowerCase();
  return DEMO_PUBLIC_POSTINGS.filter(
    (item) => item.title.toLowerCase().includes(q) || item.company.toLowerCase().includes(q)
  );
}

export function getKairosMCPManifest() {
  return {
    name: 'kairos-mcp-hub',
    version: '1.0.0',
    description: 'Kairos Career OS Model Context Protocol Hub for AI Agents',
    tools: [
      {
        name: 'analyze_resume',
        description: 'ATS 최적화를 위해 이력서를 분석하고 3단계 고도화 가이드를 반환합니다.',
        inputSchema: {
          type: 'object',
          properties: {
            resumeText: { type: 'string', description: '후보자 이력서 본문' },
            jobDescription: { type: 'string', description: '목표 채용 공고 (JD)' },
          },
          required: ['resumeText'],
        },
      },
      {
        name: 'search_public_jobs',
        description: '워크넷 및 고용24 공공 채용 정보를 통합 검색합니다.',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: { type: 'string', description: '검색 키워드 (직종, 지역)' },
          },
          required: ['keyword'],
        },
      },
      {
        name: 'generate_interview_qa',
        description: '직급 및 기업 성향에 맞춘 AI 실시간 모의면접 질문을 생성합니다.',
        inputSchema: {
          type: 'object',
          properties: {
            role: { type: 'string', description: '지원 직무' },
            difficulty: { type: 'string', enum: ['junior', 'medium', 'senior'] },
          },
          required: ['role'],
        },
      },
    ],
  };
}
