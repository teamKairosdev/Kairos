import { executeResumeRefinementChain } from 'server/services/resume';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Resume ID is required' });

  try {
    const result = await executeResumeRefinementChain(id);
    return {
      success: true,
      message: '이력서 평가 및 개선 비동기 파이프라인이 성공적으로 완료되었습니다.',
      result,
    };
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message || 'Refinement pipeline error' });
  }
});
