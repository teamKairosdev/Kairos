import { createCareerEntry } from 'server/services/career';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { company, role, period, description, achievements } = body || {};

  if (!company || !role || !description) {
    throw createError({ statusCode: 400, statusMessage: '회사명, 직무, 주요 설명은 필수 입력 항목입니다.' });
  }

  const userId = event.context.user?.userId || '00000000-0000-0000-0000-000000000000';

  const newEntry = await createCareerEntry({
    userId,
    company,
    role,
    period: period || '기타',
    description,
    achievements: achievements || [],
  });

  return newEntry;
});
