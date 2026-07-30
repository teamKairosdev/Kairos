import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../db';
import { users } from '../../../db/schema';
import { signSession } from '../../auth';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password } = body || {};

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: '이메일과 비밀번호를 입력해주세요.' });
  }

  const db = getDb();
  if (!db) {
    throw createError({ statusCode: 500, statusMessage: '데이터베이스에 연결할 수 없습니다.' });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !user.passwordHash) {
    throw createError({ statusCode: 401, statusMessage: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw createError({ statusCode: 401, statusMessage: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }

  const token = await signSession({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    walletAddress: user.walletAddress,
  });

  setCookie(event, 'kairos_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    token,
  };
});
