import { NextRequest, NextResponse } from 'next/server';
import { verifyMfaToken } from '@/server/mfa';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { eq, SQL } from 'drizzle-orm';
import { badRequest, internalError } from '@/server/http';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, token } = body || {};

    if (!token || (!userId && !email)) {
      return badRequest('사용자 정보와 OTP 번호를 입력해주세요.');
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: '데이터베이스 연결 실패' }, { status: 500 });
    }

    const query: SQL = userId ? eq(users.id, userId) : eq(users.email, email);
    const [dbUser] = await db.select().from(users).where(query);

    if (!dbUser || !dbUser.mfaEnabled || !dbUser.mfaSecret) {
      return NextResponse.json({ verified: true, mfaRequired: false });
    }

    const isValid = verifyMfaToken(token, dbUser.mfaSecret);
    if (!isValid) {
      return NextResponse.json({ error: 'OTP 번호 검증 실패' }, { status: 401 });
    }

    return NextResponse.json({
      verified: true,
      mfaRequired: true,
    });
  } catch (err: unknown) {
    return internalError(err, 'MFA 검증 실패');
  }
}
