import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { normalizeEmail, signSession } from '@/server/auth';
import { badRequest, internalError, serviceUnavailable } from '@/server/http';

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('요청 본문이 올바르지 않습니다.');
    }
    const values = body && typeof body === 'object' && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {};
    const email = typeof values.email === 'string' ? normalizeEmail(values.email) : '';
    const password = typeof values.password === 'string' ? values.password : '';
    const name = typeof values.name === 'string' ? values.name.trim() : '';

    if (!email || !password || !name) {
      return badRequest('이메일, 비밀번호, 이름을 모두 입력해주세요.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      return badRequest('이메일 형식이 올바르지 않습니다.');
    }
    if (password.length < 8 || password.length > 256) {
      return badRequest('비밀번호는 8자 이상 256자 이하로 입력해주세요.');
    }
    if (name.length > 255) return badRequest('이름은 255자 이하로 입력해주세요.');

    const db = getDb();
    if (!db) {
      return serviceUnavailable('데이터베이스 연결 실패');
    }

    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) {
      return NextResponse.json({ error: '이미 등록된 이메일입니다.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [newUser] = await db
      .insert(users)
      .values({ email, name, passwordHash })
      .returning();

    const token = await signSession({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      avatarUrl: newUser.avatarUrl,
    });

    const res = NextResponse.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        avatarUrl: newUser.avatarUrl,
      },
      token,
    });

    res.cookies.set('kairos_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return res;
  } catch (err: unknown) {
    return internalError(err, '서버 오류');
  }
}
