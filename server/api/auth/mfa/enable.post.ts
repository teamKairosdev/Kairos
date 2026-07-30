import { verifyMfaToken } from '../../../services/mfa';
import { getDb } from '../../../../db';
import { users } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user || !user.userId) {
    throw createError({ statusCode: 401, statusMessage: '인증이 필요한 요청입니다.' });
  }

  const body = await readBody(event);
  const token = body?.token;

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'OTP 번호 6자리를 입력해주세요.' });
  }

  const db = getDb();
  if (!db) {
    throw createError({ statusCode: 500, statusMessage: '데이터베이스 연결 실패' });
  }

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.userId));
  if (!dbUser || !dbUser.mfaSecret) {
    throw createError({ statusCode: 400, statusMessage: 'MFA가 먼저 설정되어야 합니다.' });
  }

  const isValid = verifyMfaToken(token, dbUser.mfaSecret);
  if (!isValid) {
    throw createError({ statusCode: 400, statusMessage: 'OTP 번호가 올바르지 않습니다. 다시 시도해주세요.' });
  }

  await db.update(users).set({ mfaEnabled: true }).where(eq(users.id, user.userId));

  return {
    success: true,
    message: '2단계 OTP 인증(MFA)이 성공적으로 활성화되었습니다.',
  };
});
