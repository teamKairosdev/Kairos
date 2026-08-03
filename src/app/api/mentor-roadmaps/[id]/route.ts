import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { mentorRoadmaps, mentorTasks } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import { findOwnedMentorRoadmap, ROADMAP_STATUSES } from '@/server/mentor';

const updateRoadmapSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  objective: z.string().trim().max(20_000).nullable().optional(),
  status: z.enum(ROADMAP_STATUSES).optional(),
  source: z.enum(['mentor', 'user', 'template']).optional(),
  targetDate: z.string().trim().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

function parseDate(value: string | null | undefined): Date | null | 'invalid' {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'invalid' : date;
}

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

    const roadmap = await findOwnedMentorRoadmap(db, id, session.userId);
    if (!roadmap) return notFound('로드맵을 찾을 수 없습니다.');
    const tasks = await db
      .select()
      .from(mentorTasks)
      .where(and(eq(mentorTasks.roadmapId, id), eq(mentorTasks.userId, session.userId)))
      .orderBy(asc(mentorTasks.sortOrder), asc(mentorTasks.createdAt));
    return NextResponse.json({ ...roadmap, tasks });
  } catch (error: unknown) {
    return internalError(error, '로드맵을 불러오지 못했습니다.');
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
    const parsed = updateRoadmapSchema.safeParse(rawBody);
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return badRequest('변경할 로드맵 정보를 입력해주세요.');
    }

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    const current = await findOwnedMentorRoadmap(db, id, session.userId);
    if (!current) return notFound('로드맵을 찾을 수 없습니다.');

    const targetDate = parseDate(parsed.data.targetDate);
    if (targetDate === 'invalid') return badRequest('목표 날짜가 올바르지 않습니다.');

    const updateData: Partial<typeof mentorRoadmaps.$inferInsert> = { updatedAt: new Date() };
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.objective !== undefined) updateData.objective = parsed.data.objective;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.source !== undefined) updateData.source = parsed.data.source;
    if (parsed.data.targetDate !== undefined) updateData.targetDate = targetDate;
    if (parsed.data.metadata !== undefined) updateData.metadata = parsed.data.metadata;

    const [updated] = await db
      .update(mentorRoadmaps)
      .set(updateData)
      .where(and(eq(mentorRoadmaps.id, id), eq(mentorRoadmaps.userId, session.userId)))
      .returning();
    if (!updated) return notFound('로드맵을 찾을 수 없습니다.');
    return NextResponse.json(updated);
  } catch (error: unknown) {
    return internalError(error, '로드맵을 수정하지 못했습니다.');
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
      .delete(mentorRoadmaps)
      .where(and(eq(mentorRoadmaps.id, id), eq(mentorRoadmaps.userId, session.userId)))
      .returning({ id: mentorRoadmaps.id });
    if (!deleted.length) return notFound('로드맵을 찾을 수 없습니다.');
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    return internalError(error, '로드맵을 삭제하지 못했습니다.');
  }
}
