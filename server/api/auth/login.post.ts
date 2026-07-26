import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from 'db';
import { users } from 'db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password } = body || {};

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: '이메일과 비밀번호를 입력해주세요.' });
  }

  const config = useRuntimeConfig();
  const jwtSecret = process.env.JWT_SECRET || config.jwtSecret;

  // Attempt DB login
  const db = getDb();
  if (db) {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (user) {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          throw createError({ statusCode: 401, statusMessage: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        const token = jwt.sign(
          { userId: user.id, email: user.email, name: user.name },
          jwtSecret,
          { expiresIn: '7d' }
        );
        setCookie(event, 'kairos_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 });

        return {
          user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
          token,
        };
      }
    } catch (err: any) {
      if (err.statusCode) throw err;
      console.warn('[Kairos] Login DB error, falling back to demo mode:', err.message);
    }
  }

  // Demo mode bypass: accept any credentials and issue a guest JWT
  console.info('[Kairos Demo] 데모 모드 로그인 - 게스트 토큰 발급');
  const demoName = email.split('@')[0] || '데모 사용자';
  const demoId = 'demo-user-' + Buffer.from(email).toString('base64').slice(0, 8);
  const token = jwt.sign({ userId: demoId, email, name: demoName }, jwtSecret, { expiresIn: '1d' });
  setCookie(event, 'kairos_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 });

  return {
    user: {
      id: demoId,
      email,
      name: demoName,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(demoName)}`,
    },
    token,
    demo: true,
  };
});

