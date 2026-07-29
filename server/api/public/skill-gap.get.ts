import { getPublicSkillGapReport } from '../../services/publicSkillGap';

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const region = (query.region as string) || '경기도';

  setResponseHeaders(event, {
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
  });

  return getPublicSkillGapReport(region);
});
