import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { chatSessions } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError } from '@/server/http';

export async function POST(req: NextRequest) {
  try {
    const { title, messages, context } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return badRequest('Messages are required');
    }

    const session = await getSession(req);
    const userId = session?.userId || null;
    const db = getDb();

    if (!db) {
      const demoId = 'demo-' + Date.now().toString(36);
      return NextResponse.json({ id: demoId, url: `/r/${demoId}` });
    }

    const [chatSession] = await db
      .insert(chatSessions)
      .values({
        userId,
        title: title || 'AI 채팅',
        messages,
        context: context || null,
      })
      .returning();

    return NextResponse.json({ id: chatSession.id, url: `/r/${chatSession.id}` });
  } catch (err: any) {
    return internalError(err, 'Save error');
  }
}
