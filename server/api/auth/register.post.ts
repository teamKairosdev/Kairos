import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from 'db';
import { users } from 'db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password, name } = body || {};

  if (!email || !password || !name) {
    throw createError({ statusCode: 400, statusMessage: '이메일, 비밀번호, 이름을 모두 입력해야 합니다.' });
  }

  const config = useRuntimeConfig();
  const jwtSecret = process.env.JWT_SECRET || config.jwtSecret;

  // Attempt DB registration (graceful in demo mode)
  const db = getDb();
  if (db) {
    try {
      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) {
        throw createError({ statusCode: 409, statusMessage: '이미 가입된 이메일 주소입니다.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const [newUser] = await db.insert(users).values({
        email,
        passwordHash,
        name,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      }).returning();

      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email, name: newUser.name },
        jwtSecret,
        { expiresIn: '7d' }
      );

      setCookie(event, 'kairos_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 });

      return {
        user: { id: newUser.id, email: newUser.email, name: newUser.name, avatarUrl: newUser.avatarUrl },
        token,
      };
    } catch (err: any) {
      if (err.statusCode) throw err; // propagate validation errors
      console.warn('[Kairos] Registration DB error, falling back to demo mode:', err.message);
    }
  }

  // Demo mode: issue a guest token without DB
  const demoId = 'demo-user-' + Date.now();
  const token = jwt.sign({ userId: demoId, email, name }, jwtSecret, { expiresIn: '1d' });
  setCookie(event, 'kairos_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 });

  return {
    user: {
      id: demoId,
      email,
      name,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
    },
    token,
    demo: true,
  };
});

