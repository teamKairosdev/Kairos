import { getDb } from 'db';
import { users } from 'db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const authUser = event.context.user;

  if (!authUser) {
    return {
      authenticated: false,
      user: {
        id: 'guest-demo-user',
        email: 'guest@kairos.ai',
        name: 'Guest Steward',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=KairosGuest',
      },
    };
  }

  let dbUser = null;
  try {
    const db = getDb();
    if (db) {
      const [user] = await db.select().from(users).where(eq(users.id, authUser.userId));
      dbUser = user;
    }
  } catch {
    // Demo mode
  }

  return {
    authenticated: true,
    user: dbUser
      ? { id: dbUser.id, email: dbUser.email, name: dbUser.name, avatarUrl: dbUser.avatarUrl, walletAddress: dbUser.walletAddress }
      : { ...authUser, walletAddress: authUser.walletAddress || null },
  };
});
