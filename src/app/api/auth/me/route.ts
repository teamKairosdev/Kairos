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

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.walletAddress !== undefined) updateData.walletAddress = body.walletAddress;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.userId))
      .returning();

    return NextResponse.json({ user: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
