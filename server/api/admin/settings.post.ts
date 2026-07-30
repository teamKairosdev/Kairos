import { setSystemConfig } from '../../services/systemConfig';

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  const body = await readBody(event);
  const { key, value, category, description } = body || {};

  if (!key || value === undefined) {
    throw createError({ statusCode: 400, statusMessage: '설정 키와 값을 모두 입력해주세요.' });
  }

  const ip = getRequestHeader(event, 'x-forwarded-for') || '127.0.0.1';

  await setSystemConfig(
    key,
    value,
    category || 'env',
    description || '',
    user?.userId,
    ip
  );

  return {
    success: true,
    message: `시스템 설정 [${key}] 항목이 성공적으로 업데이트되었습니다.`,
  };
});
