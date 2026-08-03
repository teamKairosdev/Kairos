import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { isAddress, verifyMessage } from 'viem';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { buildWalletSignInMessage, signSession, WALLET_NONCE_COOKIE } from '@/server/auth';
import { verifyMfaToken } from '@/server/mfa';
import { getSession as readSession } from '@/server/getSession';
import { badRequest, forbidden, internalError, serviceUnavailable, unauthorized } from '@/server/http';

function clearWalletNonce(response: NextResponse): void {
  response.cookies.set(WALLET_NONCE_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/api/auth',
  });
}

function publicUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    walletAddress: user.walletAddress,
  };
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown> | null;
    try {
      const parsed = await req.json();
      body = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
    } catch {
      return badRequest('요청 본문이 올바르지 않습니다.');
    }
    const address = typeof body?.address === 'string' ? body.address.trim() : '';
    const message = typeof body?.message === 'string' ? body.message : '';
    const signature = typeof body?.signature === 'string' ? body.signature : '';
    const mode = body?.mode === 'link' ? 'link' : body?.mode === 'login' || body?.mode === undefined ? 'login' : null;

    if (!mode || !address || !message || !signature) {
      return badRequest('지갑 주소, 메시지, 서명이 필요합니다.');
    }
    if (!isAddress(address)) return badRequest('지갑 주소 형식이 올바르지 않습니다.');

    const nonce = req.cookies.get(WALLET_NONCE_COOKIE)?.value;
    if (!nonce || message !== buildWalletSignInMessage(nonce, address)) {
      return unauthorized('지갑 인증 요청이 만료되었거나 유효하지 않습니다.');
    }
    if (body?.nonce !== undefined && body.nonce !== nonce) {
      return badRequest('지갑 인증 nonce가 올바르지 않습니다.');
    }

    const session = await readSession(req);
    if (mode === 'link' && !session?.userId) return unauthorized();
    if (mode === 'login' && session?.userId) {
      return forbidden('현재 로그인된 계정에서는 지갑 연결 방식을 사용해주세요.');
    }

    const formattedAddress = address.toLowerCase();

    const isValid = await verifyMessage({
      address: formattedAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json({ error: '유효하지 않은 지갑 서명입니다.' }, { status: 401 });
    }

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    let [user] = await db.select().from(users).where(eq(users.walletAddress, formattedAddress));

    if (mode === 'link') {
      if (user && user.id !== session?.userId) {
        return NextResponse.json({ error: '이미 다른 계정에 연결된 지갑입니다.' }, { status: 409 });
      }

      const [linkedUser] = await db
        .update(users)
        .set({ walletAddress: formattedAddress, updatedAt: new Date() })
        .where(eq(users.id, session!.userId))
        .returning();
      if (!linkedUser) return unauthorized('사용자 계정을 확인할 수 없습니다.');

      const response = NextResponse.json({ user: publicUser(linkedUser), linked: true });
      clearWalletNonce(response);
      return response;
    }

    if (!user) {
      const email = `wallet_${formattedAddress.slice(0, 8)}@kairos.local`;
      [user] = await db
        .insert(users)
        .values({
          email,
          name: `지갑 사용자 (${formattedAddress.slice(0, 6)})`,
          walletAddress: formattedAddress,
        })
        .returning();
    }

    const mfaToken = typeof body?.mfaToken === 'string' ? body.mfaToken.trim() : '';
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
      user: publicUser(user),
      token,
    });

    res.cookies.set('kairos_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    clearWalletNonce(res);

    return res;
  } catch (err: unknown) {
    return internalError(err, '서버 오류');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await readSession(req);
    if (!session?.userId) return unauthorized();
    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    const [updated] = await db
      .update(users)
      .set({ walletAddress: null, updatedAt: new Date() })
      .where(eq(users.id, session.userId))
      .returning();
    if (!updated) return unauthorized('사용자 계정을 확인할 수 없습니다.');

    return NextResponse.json({ success: true, user: publicUser(updated) });
  } catch (err: unknown) {
    return internalError(err, '지갑 연결 해제에 실패했습니다.');
  }
}
