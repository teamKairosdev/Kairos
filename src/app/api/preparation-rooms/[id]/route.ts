import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { preparationRooms } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import {
  isRecord,
  personalRoomMetadata,
  serializePreparationRoom,
  findOwnedPreparationRoom,
} from '@/server/preparation';

const updateRoomSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  status: z.enum(['active', 'archived']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    const room = await findOwnedPreparationRoom(db, id, session.userId);
    if (!room) return notFound('준비방을 찾을 수 없습니다.');
    return NextResponse.json(serializePreparationRoom(room));
  } catch (error: unknown) {
    return internalError(error, '준비방을 불러오지 못했습니다.');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return badRequest('요청 형식이 올바르지 않습니다.');
    }
    const parsed = updateRoomSchema.safeParse(rawBody);
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return badRequest('변경할 준비방 정보를 입력해주세요.');
    }

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    const current = await findOwnedPreparationRoom(db, id, session.userId);
    if (!current) return notFound('준비방을 찾을 수 없습니다.');

    const updateData: Partial<typeof preparationRooms.$inferInsert> = {
      updatedAt: new Date(),
      roomType: 'personal',
    };
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.metadata !== undefined) {
      updateData.metadata = personalRoomMetadata({
        ...(isRecord(current.metadata) ? current.metadata : {}),
        ...parsed.data.metadata,
      });
    }

    const [updated] = await db
      .update(preparationRooms)
      .set(updateData)
      .where(and(eq(preparationRooms.id, id), eq(preparationRooms.userId, session.userId)))
      .returning();

    if (!updated) return notFound('준비방을 찾을 수 없습니다.');
    return NextResponse.json(serializePreparationRoom(updated));
  } catch (error: unknown) {
    return internalError(error, '준비방을 수정하지 못했습니다.');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    const deleted = await db
      .delete(preparationRooms)
      .where(and(eq(preparationRooms.id, id), eq(preparationRooms.userId, session.userId)))
      .returning({ id: preparationRooms.id });

    if (!deleted.length) return notFound('준비방을 찾을 수 없습니다.');
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    return internalError(error, '준비방을 삭제하지 못했습니다.');
  }
}
