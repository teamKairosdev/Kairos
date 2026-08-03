import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db';
import { mentorTasks } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import {
  findOwnedMentorRoadmap,
  listOwnedMentorTasks,
  recordMentorTaskCompletion,
  TASK_STATUSES,
} from '@/server/mentor';

const createTaskSchema = z.object({
  roadmapId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(255),
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

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    const roadmapId = new URL(req.url).searchParams.get('roadmapId')?.trim();
    if (roadmapId) {
      const roadmap = await findOwnedMentorRoadmap(db, roadmapId, session.userId);
      if (!roadmap) return notFound('로드맵을 찾을 수 없습니다.');
    }
    const { tasks } = await listOwnedMentorTasks(db, session.userId, roadmapId || undefined);
    return NextResponse.json(tasks);
  } catch (error: unknown) {
    return internalError(error, '과제를 불러오지 못했습니다.');
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
    const parsed = createTaskSchema.safeParse(rawBody);
    if (!parsed.success) return badRequest('과제 정보가 올바르지 않습니다.');

    const dueDate = parseDate(parsed.data.dueDate);
    if (dueDate === 'invalid') return badRequest('마감 날짜가 올바르지 않습니다.');

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    const roadmap = await findOwnedMentorRoadmap(db, parsed.data.roadmapId, session.userId);
    if (!roadmap) return notFound('로드맵을 찾을 수 없습니다.');

    const status = parsed.data.status || 'todo';
    const completedAt = status === 'completed' ? new Date() : null;
    const [task] = await db
      .insert(mentorTasks)
      .values({
        roadmapId: roadmap.id,
        userId: session.userId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status,
        priority: parsed.data.priority ?? 0,
        sortOrder: parsed.data.sortOrder ?? 0,
        dueDate: dueDate ?? null,
        completedAt,
        metadata: parsed.data.metadata || {},
      })
      .returning();

    if (!task) return internalError(new Error('empty insert result'), '과제를 생성하지 못했습니다.');
    const growthEvent = status === 'completed'
      ? await recordMentorTaskCompletion(db, session.userId, task, completedAt as Date)
      : null;
    return NextResponse.json({ task, growthEvent }, { status: 201 });
  } catch (error: unknown) {
    return internalError(error, '과제를 생성하지 못했습니다.');
  }
}
