import { NextRequest, NextResponse } from 'next/server';
import { generateMfaSecret, generateMfaQrCode } from '@/server/mfa';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/server/getSession';
import { unauthorized, internalError } from '@/server/http';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return unauthorized('인증이 필요한 요청입니다.');
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: '데이터베이스 연결 실패' }, { status: 500 });
    }

    const [existingUser] = await db.select().from(users).where(eq(users.id, session.userId));
    let secret = existingUser?.mfaSecret;

    if (!secret) {
      secret = generateMfaSecret();
      await db.update(users).set({ mfaSecret: secret }).where(eq(users.id, session.userId));
    }

    const email = session.email || existingUser?.email || '';
    const { otpauthUrl, qrCodeUrl } = await generateMfaQrCode(email, secret, 'Kairos');

    return NextResponse.json({
      secret,
      qrCodeUrl,
      otpauthUrl,
      mfaEnabled: existingUser?.mfaEnabled || false,
    });
  } catch (err: any) {
    return internalError(err, 'MFA 설정 실패');
  }
}
