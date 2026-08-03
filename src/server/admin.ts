import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { forbidden, unauthorized } from '@/server/http';
import type { KairosSession } from '@/server/auth';

export async function requireAdmin(
  req: NextRequest
): Promise<KairosSession | NextResponse> {
  const session = await getSession(req);
  if (!session?.userId) return unauthorized();

  const db = getDb();
  if (!db) return forbidden('관리자 권한을 확인할 수 없습니다.');

  try {
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (user?.role !== 'admin') return forbidden();
    return session;
  } catch {
    // Missing or unavailable role data must fail closed.
    return forbidden('관리자 권한을 확인할 수 없습니다.');
  }
}
