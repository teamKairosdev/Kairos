import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { signSession } from '@/server/auth';
import { verifyMfaToken } from '@/server/mfa';
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
    const email = typeof values.email === 'string' ? values.email.trim().toLowerCase() : '';
    const password = typeof values.password === 'string' ? values.password : '';
    const mfaToken = typeof values.mfaToken === 'string' ? values.mfaToken.trim() : '';

    if (!email || !password) {
      return badRequest('이메일과 비밀번호를 입력해주세요.');
    }
    if (email.length > 255 || password.length > 256) {
      return badRequest('로그인 입력 길이가 올바르지 않습니다.');
    }

    const db = getDb();
    if (!db) {
      return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    }

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    if (user.mfaEnabled && (!mfaToken || !user.mfaSecret || !verifyMfaToken(mfaToken, user.mfaSecret))) {
      return NextResponse.json({ error: 'OTP 번호가 필요합니다.', mfaRequired: true }, { status: 401 });
    }

    const token = await signSession({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      walletAddress: user.walletAddress,
    });

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
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
