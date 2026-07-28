import bcrypt from 'bcryptjs';
import { getDb } from 'db';
import { users } from 'db/schema';
import { eq } from 'drizzle-orm';
import { getAuth } from '../../auth';

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const body = Buffer.from(payload).toString('base64url');
  const signature = Buffer.from(sig).toString('base64url');
  return `${body}.${signature}`;
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password, name } = body || {};

  if (!email || !password || !name) {
    throw createError({ statusCode: 400, statusMessage: '이메일, 비밀번호, 이름을 모두 입력해야 합니다.' });
  }

  const auth = getAuth();

  if (auth) {
    try {
      const result = await auth.api.signUpEmail({
        body: { email, password, name },
      });
      return result;
    } catch (err: any) {
      if (err?.statusCode) throw err;
      console.warn('[Kairos] Better Auth register failed, falling back:', err.message);
    }
  }

  const config = useRuntimeConfig();
  const jwtSecret = process.env.JWT_SECRET || config.jwtSecret;

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

      if (!newUser) {
        throw createError({ statusCode: 500, statusMessage: '회원가입에 실패했습니다.' });
      }

      const payload = JSON.stringify({ userId: newUser.id, email: newUser.email, name: newUser.name, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
      const token = await hmacSign(payload, jwtSecret);

      setCookie(event, 'kairos_token', token, { httpOnly: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 });

      return {
        user: { id: newUser.id, email: newUser.email, name: newUser.name, avatarUrl: newUser.avatarUrl },
        token,
      };
    } catch (err: any) {
      if (err.statusCode) throw err;
      console.warn('[Kairos] Registration DB error:', err.message);
    }
  }

  const demoId = 'demo-user-' + Date.now();
  const payload = JSON.stringify({ userId: demoId, email, name, exp: Date.now() + 24 * 60 * 60 * 1000 });
  const token = await hmacSign(payload, jwtSecret);
  setCookie(event, 'kairos_token', token, { httpOnly: true, sameSite: 'strict', maxAge: 24 * 60 * 60 });

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
