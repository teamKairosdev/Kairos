import { getAuth } from '../../auth';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password } = body || {};

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: '이메일과 비밀번호를 입력해주세요.' });
  }

  const auth = getAuth();

  if (auth) {
    try {
      const result = await auth.api.signInEmail({
        body: { email, password },
      });
      return result;
    } catch (err: any) {
      if (err?.statusCode) throw err;
    }
  }

  throw createError({ statusCode: 500, statusMessage: 'Better Auth가 설정되지 않았거나 DB에 연결할 수 없습니다.' });
});
