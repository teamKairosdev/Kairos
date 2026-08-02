import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { unauthorized } from '@/server/http';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const db = getDb();
  if (db) {
    const [user] = await db.select().from(users).where(eq(users.id, session.userId));
    if (user) {
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          walletAddress: user.walletAddress,
        },
      });
    }
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      avatarUrl: session.avatarUrl,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return unauthorized('Unauthorized');
  }

  try {
    const body = await req.json();
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: '데이터베이스에 연결할 수 없습니다.' }, { status: 500 });
    }

    const updateData: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.walletAddress !== undefined) updateData.walletAddress = body.walletAddress;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.userId))
      .returning();

    return NextResponse.json({ user: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '프로필 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return unauthorized('Unauthorized');
  }

  try {
    const db = getDb();
    if (db) {
      await db.delete(users).where(eq(users.id, session.userId));
    }

    const res = NextResponse.json({ success: true });
    res.cookies.delete('kairos_session');
    return res;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '계정 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
