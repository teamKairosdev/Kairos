import { executeResumeRefinementChain } from 'server/services/resume';
import { getCachedResponse, setCachedResponse } from 'server/services/llmCache';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Resume ID is required' });

  const cacheKey = `refine:${id}`;
  try {
    const cached = await getCachedResponse(cacheKey, 'refine');
    if (cached) {
      try {
        return { success: true, message: '캐시된 결과 반환', result: JSON.parse(cached), cached: true };
      } catch {
        // malformed cache, fall through
      }
    }
  } catch {
    // cache error, fall through
  }

  try {
    const result = await executeResumeRefinementChain(id);

    // Cache result for 1 hour
    await setCachedResponse(cacheKey, 'refine', JSON.stringify(result), 3600);

    return {
      success: true,
      message: '이력서 평가 및 개선 비동기 파이프라인이 성공적으로 완료되었습니다.',
      result,
    };
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message || 'Refinement pipeline error' });
  }
});
