import { NextRequest, NextResponse } from 'next/server';
import { verifyMfaToken } from '@/server/mfa';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/server/getSession';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: '인증이 필요한 요청입니다.' }, { status: 401 });
    }

    const body = await req.json();
    const token = body?.token;

    if (!token) {
      return NextResponse.json({ error: 'OTP 번호 6자리를 입력해주세요.' }, { status: 400 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: '데이터베이스 연결 실패' }, { status: 500 });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.id, session.userId));
    if (!dbUser || !dbUser.mfaSecret) {
      return NextResponse.json({ error: 'MFA가 먼저 설정되어야 합니다.' }, { status: 400 });
    }

    const isValid = verifyMfaToken(token, dbUser.mfaSecret);
    if (!isValid) {
      return NextResponse.json(
        { error: 'OTP 번호가 올바르지 않습니다. 다시 시도해주세요.' },
        { status: 400 }
      );
    }

    await db.update(users).set({ mfaEnabled: true }).where(eq(users.id, session.userId));

    return NextResponse.json({
      success: true,
      message: '2단계 OTP 인증(MFA)이 성공적으로 활성화되었습니다.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'MFA 활성화 실패' }, { status: 500 });
  }
}
