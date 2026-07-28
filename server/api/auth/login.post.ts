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
  const { email, password } = body || {};

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: '이메일과 비밀번호를 입력해주세요.' });
  }

  const auth = getAuth();

  if (auth) {
    try {
      const result = await auth.api.signInEmail({
        body: { email, password },
      });
      return result;
    } catch (err: any) {
      if (err?.statusCode) throw err;
      console.warn('[Kairos] Better Auth login failed, falling back:', err.message);
    }
  }

  const config = useRuntimeConfig();
  const jwtSecret = process.env.JWT_SECRET || config.jwtSecret;

  const db = getDb();
  if (db) {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (user) {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          throw createError({ statusCode: 401, statusMessage: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        const payload = JSON.stringify({ userId: user.id, email: user.email, name: user.name, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
        const token = await hmacSign(payload, jwtSecret);
        setCookie(event, 'kairos_token', token, { httpOnly: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 });

        return {
          user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
          token,
        };
      }
    } catch (err: any) {
      if (err.statusCode) throw err;
      console.warn('[Kairos] Login DB error:', err.message);
    }
  }

  console.info('[Kairos Demo] 데모 모드 로그인');
  const demoName = email.split('@')[0] || '데모 사용자';
  const demoId = 'demo-user-' + Buffer.from(email).toString('base64').slice(0, 8);
  const payload = JSON.stringify({ userId: demoId, email, name: demoName, exp: Date.now() + 24 * 60 * 60 * 1000 });
  const token = await hmacSign(payload, jwtSecret);
  setCookie(event, 'kairos_token', token, { httpOnly: true, sameSite: 'strict', maxAge: 24 * 60 * 60 });

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
