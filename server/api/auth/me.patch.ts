import { getDb } from 'db';
import { users } from 'db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId;
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

  const body = await readBody(event);
  const db = getDb();
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database unavailable' });

  const updates: Record<string, unknown> = { updatedAt: new Date() }

  if (body.name && typeof body.name === 'string') {
    updates.name = body.name
  }

  if ('walletAddress' in body) {
    updates.walletAddress = body.walletAddress
  }

  if (Object.keys(updates).length === 1) {
    throw createError({ statusCode: 400, statusMessage: 'No fields to update' })
  }

  const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
  return { user: { id: updated.id, name: updated.name, email: updated.email, walletAddress: updated.walletAddress } };
});
