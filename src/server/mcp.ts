/**
 * MCP service ported from server/services/mcp.ts (pure functions, no Nuxt APIs)
 */

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
