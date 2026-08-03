import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { preparationMessages } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import {
  findOwnedPreparationRoom,
  getNextPreparationMessageSequence,
  hashPreparationContent,
  asMetadata,
} from '@/server/preparation';

const createMessageSchema = z.object({
  roomId: z.string().trim().min(1),
  content: z.string().trim().min(1).max(20_000),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    const roomId = new URL(req.url).searchParams.get('roomId')?.trim();
    if (roomId) {
      const room = await findOwnedPreparationRoom(db, roomId, session.userId);
      if (!room) return notFound('준비방을 찾을 수 없습니다.');
    }

    const messages = await db
      .select()
      .from(preparationMessages)
      .where(
        roomId
          ? and(eq(preparationMessages.userId, session.userId), eq(preparationMessages.roomId, roomId))
          : eq(preparationMessages.userId, session.userId),
      )
      .orderBy(asc(preparationMessages.createdAt), asc(preparationMessages.sequence));

    return NextResponse.json(messages);
  } catch (error: unknown) {
    return internalError(error, '메시지를 불러오지 못했습니다.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return badRequest('요청 형식이 올바르지 않습니다.');
    }
    const parsed = createMessageSchema.safeParse(rawBody);
    if (!parsed.success) return badRequest('준비방과 메시지 내용을 입력해주세요.');

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    const room = await findOwnedPreparationRoom(db, parsed.data.roomId, session.userId);
    if (!room) return notFound('준비방을 찾을 수 없습니다.');
    if (room.status !== 'active') {
      return NextResponse.json({ error: '보관된 준비방에는 메시지를 저장할 수 없습니다.' }, { status: 409 });
    }

    const content = parsed.data.content.trim();
    const sequence = await getNextPreparationMessageSequence(db, room.id, session.userId);
    const [message] = await db
      .insert(preparationMessages)
      .values({
        roomId: room.id,
        userId: session.userId,
        sequence,
        senderType: 'user',
        content,
        contentHash: hashPreparationContent(content),
        metadata: asMetadata(parsed.data.metadata),
      })
      .returning();

    if (!message) return internalError(new Error('empty insert result'), '메시지를 저장하지 못했습니다.');
    return NextResponse.json(message, { status: 201 });
  } catch (error: unknown) {
    return internalError(error, '메시지를 저장하지 못했습니다.');
  }
}
