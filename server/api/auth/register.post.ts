import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../db';
import { users } from '../../../db/schema';
import { signSession } from '../../auth';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password, name } = body || {};

  if (!email || !password || !name) {
    throw createError({ statusCode: 400, statusMessage: '이메일, 비밀번호, 이름을 모두 입력해주세요.' });
  }

  const db = getDb();
  if (!db) {
    throw createError({ statusCode: 500, statusMessage: '데이터베이스에 연결할 수 없습니다.' });
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    throw createError({ statusCode: 400, statusMessage: '이미 가입된 이메일입니다.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({
      email,
      name,
      passwordHash,
    })
    .returning();

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
