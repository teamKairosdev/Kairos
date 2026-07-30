import { eq } from 'drizzle-orm';
import { exchangeGoogleCode, fetchGoogleUserInfo, signSession } from '../../../auth';
import { getDb } from '../../../../db';
import { users } from '../../../../db/schema';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const code = query.code as string;
  const state = query.state as string;
  const cookieState = getCookie(event, 'oauth_state');

  deleteCookie(event, 'oauth_state');

  if (!code || !state || state !== cookieState) {
    throw createError({ statusCode: 400, statusMessage: 'Google 인증 요청이 유효하지 않습니다.' });
  }

  try {
    const { accessToken } = await exchangeGoogleCode(code);
    const googleUser = await fetchGoogleUserInfo(accessToken);

    const db = getDb();
    if (!db) {
      throw createError({ statusCode: 500, statusMessage: '데이터베이스에 연결할 수 없습니다.' });
    }

    let [user] = await db.select().from(users).where(eq(users.email, googleUser.email));

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          email: googleUser.email,
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

    return sendRedirect(event, '/');
  } catch (err: unknown) {
    console.error('Google OAuth callback error:', err);
    throw createError({ statusCode: 500, statusMessage: 'Google 로그인 처리 중 오류가 발생했습니다.' });
  }
});
