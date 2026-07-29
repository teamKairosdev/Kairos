import { fetchAndExtractProjects } from 'server/services/portfolio';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { sourceUrl, sourceDescription } = body || {};

  if (!sourceUrl || !sourceDescription) {
    throw createError({ statusCode: 400, statusMessage: '수집할 URL과 설명을 입력해주세요.' });
  }

  try {
    const result = await fetchAndExtractProjects(sourceDescription, sourceUrl);
    return { success: true, projects: result.projects };
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message || 'AI 데이터 수집 실패' });
  }
});
