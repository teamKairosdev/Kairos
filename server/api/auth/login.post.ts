import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from 'db';
import { users } from 'db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password } = body || {};

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: '이메일과 비밀번호를 입력해주세요.' });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw createError({ statusCode: 401, statusMessage: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }

  const config = useRuntimeConfig();
  const jwtSecret = process.env.JWT_SECRET || config.jwtSecret;

  const token = jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    jwtSecret,
    { expiresIn: '7d' }
  );

  setCookie(event, 'kairos_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
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
