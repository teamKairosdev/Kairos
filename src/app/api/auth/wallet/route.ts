import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { verifyMessage } from 'viem';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { signSession } from '@/server/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, message, signature } = body || {};

    if (!address || !message || !signature) {
      return NextResponse.json({ error: '지갑 주소, 메시지, 서명이 필요합니다.' }, { status: 400 });
    }

    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json({ error: '유효하지 않은 지갑 서명입니다.' }, { status: 401 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: '데이터베이스에 연결할 수 없습니다.' }, { status: 500 });
    }

    const formattedAddress = address.toLowerCase();
    let [user] = await db.select().from(users).where(eq(users.walletAddress, formattedAddress));

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
        walletAddress: user.walletAddress,
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 });
  }
}
