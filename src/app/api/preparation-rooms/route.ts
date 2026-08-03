import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { preparationRooms } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, serviceUnavailable, unauthorized } from '@/server/http';
import {
  PERSONAL_PREPARATION_ROOM_TYPE,
  personalRoomMetadata,
  serializePreparationRoom,
} from '@/server/preparation';

const createRoomSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
});

function parseBody(value: unknown) {
  const parsed = createRoomSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    const rooms = await db
      .select()
      .from(preparationRooms)
      .where(eq(preparationRooms.userId, session.userId))
      .orderBy(desc(preparationRooms.updatedAt));

    return NextResponse.json(rooms.map(serializePreparationRoom));
  } catch (error: unknown) {
    return internalError(error, '준비방을 불러오지 못했습니다.');
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

    const body = parseBody(rawBody);
    if (!body) return badRequest('준비방 제목 또는 메타데이터가 올바르지 않습니다.');

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    const [room] = await db
      .insert(preparationRooms)
      .values({
        userId: session.userId,
        title: body.title || '취업 준비방',
        roomType: PERSONAL_PREPARATION_ROOM_TYPE,
        status: 'active',
        metadata: personalRoomMetadata(body.metadata),
      })
      .returning();

    if (!room) return internalError(new Error('empty insert result'), '준비방을 생성하지 못했습니다.');
    return NextResponse.json(serializePreparationRoom(room), { status: 201 });
  } catch (error: unknown) {
    return internalError(error, '준비방을 생성하지 못했습니다.');
  }
}
