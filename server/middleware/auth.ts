import { getAuth } from '../auth';

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;
  if (path.startsWith('/api/auth') || path === '/' || path.startsWith('/_nuxt') || path.startsWith('/__nuxt')) {
    return;
  }

  const auth = getAuth();
  if (!auth) return;

  try {
    const session = await auth.api.getSession({ headers: getRequestHeaders(event) as Record<string, string> });
    if (session) {
      const { getDb } = await import('db')
      const { users: usersTable } = await import('db/schema')
      const { eq } = await import('drizzle-orm')
      let walletAddress: string | null = null
      try {
        const db = getDb()
        if (db) {
          const [user] = await db.select({ walletAddress: usersTable.walletAddress }).from(usersTable).where(eq(usersTable.id, session.user.id))
          walletAddress = user?.walletAddress || null
        }
      } catch {}
      event.context.user = { userId: session.user.id, email: session.user.email, name: session.user.name, walletAddress };
      event.context.session = session;
    }
  } catch {
    // Session invalid
  }
});
