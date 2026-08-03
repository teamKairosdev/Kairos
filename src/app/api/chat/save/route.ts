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
    if (messages.length > 100 || JSON.stringify(messages).length > 128 * 1024) {
      return badRequest('대화 내용이 허용된 크기를 초과했습니다.');
    }
    if (typeof title !== 'undefined' && (typeof title !== 'string' || title.length > 255)) {
      return badRequest('채팅 제목이 올바르지 않습니다.');
    }
    if (typeof context !== 'undefined' && context !== null && (typeof context !== 'string' || context.length > 20_000)) {
      return badRequest('채팅 context가 허용된 크기를 초과했습니다.');
    }

    const session = await getSession(req);
    const userId = session?.userId || null;
    const db = getDb();

    if (!db) {
      const demoId = 'demo-' + Date.now().toString(36);
      const response = NextResponse.json({ id: demoId, url: `/r/${demoId}`, demo: true });
      response.headers.set('X-Kairos-Demo', '1');
      return response;
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

    if (!chatSession) return internalError(new Error('empty insert result'), '채팅 저장에 실패했습니다.');
    return NextResponse.json({ id: chatSession.id, url: `/r/${chatSession.id}`, demo: false });
  } catch (err: unknown) {
    return internalError(err, 'Save error');
  }
}
