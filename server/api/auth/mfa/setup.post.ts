import { generateMfaSecret, generateMfaQrCode } from '../../../services/mfa';
import { getDb } from '../../../../db';
import { users } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user || !user.userId) {
    throw createError({ statusCode: 401, statusMessage: '인증이 필요한 요청입니다.' });
  }

  const db = getDb();
  if (!db) {
    throw createError({ statusCode: 500, statusMessage: '데이터베이스 연결 실패' });
  }

  const [existingUser] = await db.select().from(users).where(eq(users.id, user.userId));
  let secret = existingUser?.mfaSecret;

  if (!secret) {
    secret = generateMfaSecret();
    await db.update(users).set({ mfaSecret: secret }).where(eq(users.id, user.userId));
  }

  const { otpauthUrl, qrCodeUrl } = await generateMfaQrCode(user.email, secret, 'Kairos');

  return {
    secret,
    qrCodeUrl,
    otpauthUrl,
    mfaEnabled: existingUser?.mfaEnabled || false,
  };
});
