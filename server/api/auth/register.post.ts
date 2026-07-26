import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from 'db';
import { users } from 'db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password, name } = body || {};

  if (!email || !password || !name) {
    throw createError({ statusCode: 400, statusMessage: '이메일, 비밀번호, 이름을 모두 입력해야 합니다.' });
  }

  // Check existing user
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: '이미 가입된 이메일 주소입니다.' });
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Insert user
  const [newUser] = await db.insert(users).values({
    email,
    passwordHash,
    name,
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
  }).returning();

  const config = useRuntimeConfig();
  const jwtSecret = process.env.JWT_SECRET || config.jwtSecret;

  const token = jwt.sign(
    { userId: newUser.id, email: newUser.email, name: newUser.name },
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
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      avatarUrl: newUser.avatarUrl,
    },
    token,
  };
});
