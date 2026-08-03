import { NextRequest, NextResponse } from 'next/server';
import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { mentorTasks } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import {
  findOwnedMentorTask,
  recordMentorTaskCompletion,
  TASK_STATUSES,
} from '@/server/mentor';

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(20_000).nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.number().int().min(0).max(5).optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  dueDate: z.string().trim().nullable().optional(),
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
    const owned = await findOwnedMentorTask(db, id, session.userId);
    if (!owned) return notFound('과제를 찾을 수 없습니다.');
    return NextResponse.json(owned.task);
  } catch (error: unknown) {
    return internalError(error, '과제를 불러오지 못했습니다.');
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
    const parsed = updateTaskSchema.safeParse(rawBody);
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return badRequest('변경할 과제 정보를 입력해주세요.');
    }

    const dueDate = parseDate(parsed.data.dueDate);
    if (dueDate === 'invalid') return badRequest('마감 날짜가 올바르지 않습니다.');

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    const owned = await findOwnedMentorTask(db, id, session.userId);
    if (!owned) return notFound('과제를 찾을 수 없습니다.');

    const updateData: Partial<typeof mentorTasks.$inferInsert> = { updatedAt: new Date() };
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority;
    if (parsed.data.sortOrder !== undefined) updateData.sortOrder = parsed.data.sortOrder;
    if (parsed.data.dueDate !== undefined) updateData.dueDate = dueDate;
    if (parsed.data.metadata !== undefined) updateData.metadata = parsed.data.metadata;

    let completionEvent = null;
    if (parsed.data.status === 'completed') {
      const completedAt = owned.task.completedAt ?? new Date();
      updateData.status = 'completed';
      updateData.completedAt = completedAt;
      const [updated] = await db
        .update(mentorTasks)
        .set(updateData)
        .where(
          owned.task.status === 'completed'
            ? and(eq(mentorTasks.id, id), eq(mentorTasks.userId, session.userId))
            : and(eq(mentorTasks.id, id), eq(mentorTasks.userId, session.userId), ne(mentorTasks.status, 'completed')),
        )
        .returning();
      if (!updated) return notFound('과제를 찾을 수 없습니다.');
      if (owned.task.status !== 'completed') {
        completionEvent = await recordMentorTaskCompletion(db, session.userId, updated, completedAt);
      }
      return NextResponse.json({ task: updated, growthEvent: completionEvent });
    }

    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
      updateData.completedAt = null;
    }

    const [updated] = await db
      .update(mentorTasks)
      .set(updateData)
      .where(and(eq(mentorTasks.id, id), eq(mentorTasks.userId, session.userId)))
      .returning();
    if (!updated) return notFound('과제를 찾을 수 없습니다.');
    return NextResponse.json({ task: updated, growthEvent: null });
  } catch (error: unknown) {
    return internalError(error, '과제를 수정하지 못했습니다.');
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
    const owned = await findOwnedMentorTask(db, id, session.userId);
    if (!owned) return notFound('과제를 찾을 수 없습니다.');

    const deleted = await db
      .delete(mentorTasks)
      .where(and(eq(mentorTasks.id, id), eq(mentorTasks.userId, session.userId)))
      .returning({ id: mentorTasks.id });
    if (!deleted.length) return notFound('과제를 찾을 수 없습니다.');
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    return internalError(error, '과제를 삭제하지 못했습니다.');
  }
}
