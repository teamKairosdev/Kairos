import { verifyMfaToken } from '../../../services/mfa';
import { getDb } from '../../../../db';
import { users } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { userId, email, token } = body || {};

  if (!token || (!userId && !email)) {
    throw createError({ statusCode: 400, statusMessage: '사용자 정보와 OTP 번호를 입력해주세요.' });
  }

  const db = getDb();
  if (!db) {
    throw createError({ statusCode: 500, statusMessage: '데이터베이스 연결 실패' });
  }

  const query = userId ? eq(users.id, userId) : eq(users.email, email);
  const [dbUser] = await db.select().from(users).where(query);

  if (!dbUser || !dbUser.mfaEnabled || !dbUser.mfaSecret) {
    return { verified: true, mfaRequired: false };
  }

  const isValid = verifyMfaToken(token, dbUser.mfaSecret);
  if (!isValid) {
    throw createError({ statusCode: 401, statusMessage: 'OTP 번호 검증 실패' });
  }

  return {
    verified: true,
    mfaRequired: true,
  };
});
