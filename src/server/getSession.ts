/**
 * Next.js API Route에서 쿠키를 파싱하고 JWT 세션을 검증하는 헬퍼.
 * server/auth.ts의 verifySession을 래핑합니다.
 */
import { type NextRequest } from 'next/server';
import { verifySession, type KairosSession } from './auth';

export async function getSession(req: NextRequest): Promise<KairosSession | null> {
  const token = req.cookies.get('kairos_session')?.value;
  if (!token) return null;

  const session = await verifySession(token);
  if (!session || typeof session.userId !== 'string' || !session.userId) return null;
  return session;
}
