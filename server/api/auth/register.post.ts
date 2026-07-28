import { getAuth } from '../../auth';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password, name } = body || {};

  if (!email || !password || !name) {
    throw createError({ statusCode: 400, statusMessage: '이메일, 비밀번호, 이름을 모두 입력해야 합니다.' });
  }

  const auth = getAuth();

  if (auth) {
    try {
      const result = await auth.api.signUpEmail({
        body: { email, password, name },
      });
      return result;
    } catch (err: any) {
      if (err?.statusCode) throw err;
    }
  }

  throw createError({ statusCode: 500, statusMessage: 'Better Auth가 설정되지 않았거나 DB에 연결할 수 없습니다.' });
});
