export default defineEventHandler(() => {
  throw createError({ statusCode: 404, statusMessage: '인증 경로를 찾을 수 없습니다.' });
});
