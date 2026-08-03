import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { growthEvents } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import { findOwnedMentorRoadmap, findOwnedMentorTask } from '@/server/mentor';

const createEventSchema = z.object({
  roadmapId: z.string().trim().min(1).optional(),
  taskId: z.string().trim().min(1).optional(),
  eventType: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(20_000).nullable().optional(),
  impactScore: z.number().int().min(0).max(100).nullable().optional(),
  occurredAt: z.string().trim().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const RESERVED_COMMUNITY_EVENT_TYPES = new Set(['community_answer', 'community_feedback', 'mission_check_in']);

function parseDate(value: string | undefined): Date | undefined | 'invalid' {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'invalid' : date;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    const params = new URL(req.url).searchParams;
    const roadmapId = params.get('roadmapId')?.trim();
    const taskId = params.get('taskId')?.trim();
    if (roadmapId && !(await findOwnedMentorRoadmap(db, roadmapId, session.userId))) {
      return notFound('로드맵을 찾을 수 없습니다.');
    }
    if (taskId && !(await findOwnedMentorTask(db, taskId, session.userId))) {
      return notFound('과제를 찾을 수 없습니다.');
    }

    const filters = [eq(growthEvents.userId, session.userId)];
    if (roadmapId) filters.push(eq(growthEvents.roadmapId, roadmapId));
    if (taskId) filters.push(eq(growthEvents.taskId, taskId));
    const events = await db
      .select()
      .from(growthEvents)
      .where(filters.length === 1 ? filters[0] : and(...filters))
      .orderBy(desc(growthEvents.occurredAt));
    return NextResponse.json(events.filter(event => !RESERVED_COMMUNITY_EVENT_TYPES.has(event.eventType)));
  } catch (error: unknown) {
    return internalError(error, '성장 기록을 불러오지 못했습니다.');
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
    const parsed = createEventSchema.safeParse(rawBody);
    if (!parsed.success) return badRequest('성장 기록 정보가 올바르지 않습니다.');
    if (RESERVED_COMMUNITY_EVENT_TYPES.has(parsed.data.eventType)) {
      return badRequest('커뮤니티 활동과 미션 체크인은 전용 API로 기록해주세요.');
    }
    const occurredAt = parseDate(parsed.data.occurredAt);
    if (occurredAt === 'invalid') return badRequest('기록 날짜가 올바르지 않습니다.');

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    let roadmapId = parsed.data.roadmapId;
    if (roadmapId && !(await findOwnedMentorRoadmap(db, roadmapId, session.userId))) {
      return notFound('로드맵을 찾을 수 없습니다.');
    }
    if (parsed.data.taskId) {
      const ownedTask = await findOwnedMentorTask(db, parsed.data.taskId, session.userId);
      if (!ownedTask) return notFound('과제를 찾을 수 없습니다.');
      if (roadmapId && roadmapId !== ownedTask.task.roadmapId) {
        return badRequest('과제와 로드맵이 일치하지 않습니다.');
      }
      roadmapId = ownedTask.task.roadmapId;
    }

    const [event] = await db
      .insert(growthEvents)
      .values({
        userId: session.userId,
        roadmapId: roadmapId || null,
        taskId: parsed.data.taskId || null,
        eventType: parsed.data.eventType,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        impactScore: parsed.data.impactScore ?? null,
        occurredAt: occurredAt ?? new Date(),
        metadata: parsed.data.metadata || {},
      })
      .returning();

    if (!event) return internalError(new Error('empty insert result'), '성장 기록을 저장하지 못했습니다.');
    return NextResponse.json(event, { status: 201 });
  } catch (error: unknown) {
    return internalError(error, '성장 기록을 저장하지 못했습니다.');
  }
}
