import { analyzeCompanyMetaInfo } from '../../services/companyMeta';
import { getCachedResponse, setCachedResponse } from 'server/services/llmCache';

export default defineEventHandler(async (event) => {
  const { companyName, rawReviews } = await readBody(event);

  if (!companyName) {
    throw createError({ statusCode: 400, statusMessage: 'Company name is required' });
  }

  const cacheKey = `company:meta:${companyName}`;
  const cached = await getCachedResponse(cacheKey, 'companyMeta');
  if (cached) {
    return { success: true, analysis: JSON.parse(cached), cached: true };
  }

  try {
    const analysis = await analyzeCompanyMetaInfo(companyName, rawReviews);
    await setCachedResponse(cacheKey, 'companyMeta', JSON.stringify(analysis), 86400);

    return {
      success: true,
      analysis,
    };
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message || 'Company analysis failed' });
  }
});
