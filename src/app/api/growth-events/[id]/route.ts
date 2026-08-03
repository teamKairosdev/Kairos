import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { growthEvents } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';

const updateEventSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(20_000).nullable().optional(),
  impactScore: z.number().int().min(0).max(100).nullable().optional(),
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
    const [event] = await db
      .select()
      .from(growthEvents)
      .where(and(eq(growthEvents.id, id), eq(growthEvents.userId, session.userId)));
    if (!event) return notFound('성장 기록을 찾을 수 없습니다.');
    return NextResponse.json(event);
  } catch (error: unknown) {
    return internalError(error, '성장 기록을 불러오지 못했습니다.');
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
    const parsed = updateEventSchema.safeParse(rawBody);
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return badRequest('변경할 성장 기록 정보를 입력해주세요.');
    }

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    const [updated] = await db
      .update(growthEvents)
      .set(parsed.data)
      .where(and(eq(growthEvents.id, id), eq(growthEvents.userId, session.userId)))
      .returning();
    if (!updated) return notFound('성장 기록을 찾을 수 없습니다.');
    return NextResponse.json(updated);
  } catch (error: unknown) {
    return internalError(error, '성장 기록을 수정하지 못했습니다.');
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
      .delete(growthEvents)
      .where(and(eq(growthEvents.id, id), eq(growthEvents.userId, session.userId)))
      .returning({ id: growthEvents.id });
    if (!deleted.length) return notFound('성장 기록을 찾을 수 없습니다.');
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    return internalError(error, '성장 기록을 삭제하지 못했습니다.');
  }
}
