import { getDb } from 'db';
import { chatSessions } from 'db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Chat ID missing' });

  const db = getDb();
  if (db) {
    try {
      const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
      if (session) return session;
    } catch {
      console.warn('[Kairos] chat/[id] DB load failed');
    }
  }

  throw createError({ statusCode: 404, statusMessage: 'Chat session not found' });
});
