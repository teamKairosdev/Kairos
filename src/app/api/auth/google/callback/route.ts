import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { exchangeGoogleCode, fetchGoogleUserInfo, normalizeEmail, signSession } from '@/server/auth';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { badRequest } from '@/server/http';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const cookieState = req.cookies.get('oauth_state')?.value;

  if (!code || !state || state !== cookieState) {
    return badRequest('Google 인증 요청이 유효하지 않습니다.');
  }

  try {
    const { accessToken } = await exchangeGoogleCode(code);
    const googleUser = await fetchGoogleUserInfo(accessToken);

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: '데이터베이스 연결 실패' }, { status: 500 });
    }

    let [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(googleUser.email)));

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          email: normalizeEmail(googleUser.email),
          name: googleUser.name || 'Google 사용자',
          avatarUrl: googleUser.picture || null,
          googleId: googleUser.sub,
        })
        .returning();
    } else if (!user.googleId || !user.avatarUrl) {
      [user] = await db
        .update(users)
        .set({
          googleId: googleUser.sub,
          avatarUrl: user.avatarUrl || googleUser.picture || null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();
    }

    if (user.mfaEnabled) {
      return NextResponse.json(
        { error: '이 계정은 OTP 인증이 필요합니다. 비밀번호 로그인에서 OTP를 입력해주세요.', mfaRequired: true },
        { status: 403 },
      );
    }

    const token = await signSession({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      walletAddress: user.walletAddress,
    });

    const res = NextResponse.redirect(new URL('/', req.url));
    res.cookies.delete('oauth_state');
    res.cookies.set('kairos_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return res;
  } catch (err: unknown) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.json({ error: 'Google 로그인 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
