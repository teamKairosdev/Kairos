import { getDb } from 'db';
import { chatSessions } from 'db/schema';

export default defineEventHandler(async (event) => {
  const { title, messages, context } = await readBody(event);
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Messages are required' });
  }

  const userId = event.context.user?.userId;
  const db = getDb();

  if (!db) {
    return { id: 'demo-' + Date.now().toString(36), url: `/r/demo-${Date.now().toString(36)}` };
  }

  const [session] = await db.insert(chatSessions).values({
    userId: userId || null,
    title: title || 'AI 채팅',
    messages,
    context: context || null,
  }).returning();

  return { id: session.id, url: `/r/${session.id}` };
});
