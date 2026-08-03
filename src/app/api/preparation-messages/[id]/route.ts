import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { preparationMessages } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import {
  asMetadata,
  findOwnedPreparationMessage,
  hashPreparationContent,
} from '@/server/preparation';

const updateMessageSchema = z.object({
  content: z.string().trim().min(1).max(20_000).optional(),
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

    const owned = await findOwnedPreparationMessage(db, id, session.userId);
    if (!owned) return notFound('메시지를 찾을 수 없습니다.');
    return NextResponse.json(owned.message);
  } catch (error: unknown) {
    return internalError(error, '메시지를 불러오지 못했습니다.');
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
    const parsed = updateMessageSchema.safeParse(rawBody);
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return badRequest('변경할 메시지 정보를 입력해주세요.');
    }

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    const owned = await findOwnedPreparationMessage(db, id, session.userId);
    if (!owned) return notFound('메시지를 찾을 수 없습니다.');

    const updateData: Partial<typeof preparationMessages.$inferInsert> = {};
    if (parsed.data.content !== undefined) {
      const content = parsed.data.content.trim();
      updateData.content = content;
      updateData.contentHash = hashPreparationContent(content);
    }
    if (parsed.data.metadata !== undefined) updateData.metadata = asMetadata(parsed.data.metadata);

    const [updated] = await db
      .update(preparationMessages)
      .set(updateData)
      .where(and(eq(preparationMessages.id, id), eq(preparationMessages.userId, session.userId)))
      .returning();

    if (!updated) return notFound('메시지를 찾을 수 없습니다.');
    return NextResponse.json(updated);
  } catch (error: unknown) {
    return internalError(error, '메시지를 수정하지 못했습니다.');
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

    const owned = await findOwnedPreparationMessage(db, id, session.userId);
    if (!owned) return notFound('메시지를 찾을 수 없습니다.');

    const deleted = await db
      .delete(preparationMessages)
      .where(and(eq(preparationMessages.id, id), eq(preparationMessages.userId, session.userId)))
      .returning({ id: preparationMessages.id });

    if (!deleted.length) return notFound('메시지를 찾을 수 없습니다.');
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    return internalError(error, '메시지를 삭제하지 못했습니다.');
  }
}
