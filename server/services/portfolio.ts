import { z } from 'zod';
import { callLLMStructured, isDemoMode } from 'server/services/llm';

const projectSchema = z.object({
  projects: z.array(z.object({
    title: z.string(),
    description: z.string(),
    techStack: z.array(z.string()),
    projectUrl: z.string().optional(),
    sourceUrl: z.string().optional(),
    highlights: z.array(z.string()),
    duration: z.string().optional(),
  })),
});

export type ExtractedProjects = z.infer<typeof projectSchema>;

export async function fetchAndExtractProjects(
  sourceDescription: string,
  sourceUrl: string
): Promise<ExtractedProjects> {
  let pageContent = '';

  try {
    const res = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'Kairos-Portfolio-Bot/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const text = await res.text();
      pageContent = text.slice(0, 8000);
    }
  } catch {
    console.warn('[Kairos] Failed to fetch URL for portfolio AI import');
  }

  if (!pageContent || isDemoMode()) {
    console.info('[Kairos Demo] AI 포트폴리오 수집 - 데모 응답 반환');
    return {
      projects: [
        {
          title: 'Kairos AI 취업 플랫폼',
          description: 'Nuxt 4 + AI SDK 기반 취업 준비 플랫폼. 이력서 고도화, 모의 면접, ATS 분석 기능 탑재.',
          techStack: ['Nuxt 4', 'TypeScript', 'PostgreSQL', 'pgvector', 'Vercel AI SDK'],
          projectUrl: 'https://kairos.dev',
          sourceUrl: 'https://github.com/teamKairosdev/Kairos',
          highlights: [
            '비동기 이력서 고도화 파이프라인 구축 (Draft→Evaluate→Improve)',
            'SSE 스트리밍 기반 AI 모의 면접 시스템',
            'pgvector 1536차원 시맨틱 검색 엔진',
          ],
          duration: '2025.01 - 현재',
        },
        {
          title: '실시간 채팅 애플리케이션',
          description: 'WebSocket 기반 실시간 채팅 서비스. 마이크로서비스 아키텍처 적용.',
          techStack: ['Node.js', 'Socket.io', 'Redis', 'Docker', 'Kubernetes'],
          highlights: [
            'STOMP 프로토콜 기반 실시간 메시징',
            'Redis Pub/Sub으로 수평 확장 구현',
            'K6 부하 테스트로 동시 10K 연결 검증',
          ],
          duration: '2024.03 - 2024.08',
        },
      ],
    };
  }

  const instructions = `You are a portfolio data extraction specialist.
Analyze the web page content and extract project information.
If you find GitHub repositories, project descriptions, or portfolio items, extract them with details.
Respond in Korean. Focus on technical projects and their impact.`;

  const prompt = `사용자가 "${sourceDescription}"라고 설명한 자료를 아래 URL에서 가져왔습니다.
URL: ${sourceUrl}

웹페이지 내용:
${pageContent.slice(0, 4000)}

위 내용에서 프로젝트 정보를 추출해 주세요. 각 프로젝트마다 제목, 설명, 사용 기술, 하이라이트를 포함해 주세요.`;

  return await callLLMStructured<ExtractedProjects>({
    instructions,
    prompt,
    schema: projectSchema,
    temperature: 0.3,
  });
}
