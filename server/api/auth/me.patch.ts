import { getDb } from 'db';
import { users } from 'db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId;
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

  const { name } = await readBody(event);
  if (!name || typeof name !== 'string') throw createError({ statusCode: 400, statusMessage: 'Name is required' });

  const db = getDb();
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database unavailable' });

  const [updated] = await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
  return { user: { id: updated.id, name: updated.name, email: updated.email } };
});
