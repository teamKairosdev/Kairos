import { parseCookies } from 'h3';
import { verifySession } from '../auth';
import { getDb } from '../../db';
import { users as usersTable } from '../../db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;
  if (path.startsWith('/api/auth') || path === '/' || path.startsWith('/_nuxt') || path.startsWith('/__nuxt')) {
    return;
  }

  const cookies = parseCookies(event);
  const token = cookies.kairos_session || getRequestHeader(event, 'authorization')?.replace('Bearer ', '');

  if (!token) return;

  const session = await verifySession(token);
  if (session) {
    let walletAddress: string | null = null;
    try {
      const db = getDb();
      if (db) {
        const [user] = await db
          .select({ walletAddress: usersTable.walletAddress })
          .from(usersTable)
          .where(eq(usersTable.id, session.userId));
        walletAddress = user?.walletAddress || null;
      }
    } catch {}

    event.context.user = {
      userId: session.userId,
      email: session.email,
      name: session.name,
      avatarUrl: session.avatarUrl,
      walletAddress,
    };
    event.context.session = session;
  }
});
