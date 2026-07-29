/**
 * Kairos Public Benefit Skill Gap Analysis Service
 * (Supports Universities & Gyeonggi Regional Youth Employment Analytics)
 */

export interface SkillGapData {
  region: string;
  targetMajor: string;
  requiredSkillsTop10: string[];
  possessedSkillsTop10: string[];
  criticalGapSkills: Array<{ skill: string; gapRatioPercent: number; demandGrowth: string }>;
  aiPolicyInsight: string;
}

const DEMO_SKILL_GAP_REPORT: SkillGapData = {
  region: '경기도 / 수도권',
  targetMajor: '컴퓨터공학 & SW 융합 직군',
  requiredSkillsTop10: [
    'TypeScript/Nuxt.js',
    'PostgreSQL/pgvector',
    'AWS Cloud Architecture',
    'Docker/Kubernetes',
    'AI SDK Prompt Engineering',
    'CI/CD Pipeline',
    'Redis Caching',
    'Python FastApi',
    'System Design',
    'GraphQL',
  ],
  possessedSkillsTop10: [
    'Java/Spring Boot',
    'HTML/CSS/JS',
    'MySQL Base',
    'Python Basic',
    'Git/GitHub',
    'React',
    'Linux Commands',
    'C/C++',
    'Android Basics',
    'JPA',
  ],
  criticalGapSkills: [
    { skill: 'PostgreSQL pgvector 시맨틱 검색', gapRatioPercent: 42, demandGrowth: '+120% YoY' },
    { skill: 'Cloud infrastructure & Docker', gapRatioPercent: 38, demandGrowth: '+85% YoY' },
    { skill: 'AI SDK & Agent Guardrail Engineering', gapRatioPercent: 55, demandGrowth: '+210% YoY' },
  ],
  aiPolicyInsight:
    '최근 6개월간 경기도 청년 구직자의 최대 스킬 갭은 "클라우드 구축 및 pgvector AI 통합 역량"입니다. 대학 교육 과정에 서버리스 DB 및 AI 에이전트 실습을 도입할 경우 취업 성공률이 34% 증가할 것으로 집계됩니다.',
};

export async function getPublicSkillGapReport(region: string = '경기도'): Promise<SkillGapData> {
  console.info(`[Kairos Public Benefit Engine] Generating Youth Skill-Gap Report for region: ${region}`);
  return { ...DEMO_SKILL_GAP_REPORT, region };
}
