import { getDb } from 'db';
import { interviewMessages } from 'db/schema';
import { eq, asc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Interview ID missing' });

  const db = getDb();
  if (!db || id.startsWith('demo-')) return [];

  try {
    const messages = await db
      .select()
      .from(interviewMessages)
      .where(eq(interviewMessages.interviewId, id))
      .orderBy(asc(interviewMessages.createdAt));

    return messages.map(m => ({
      sender: m.sender,
      message: m.message,
      feedback: m.feedback,
    }));
  } catch {
    console.warn('[Kairos] interview chat history fetch failed');
    return [];
  }
});
