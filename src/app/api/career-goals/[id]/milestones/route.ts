import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { careerGoals, careerMilestones } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, unauthorized } from '@/server/http';
import {
  createFallbackMilestone,
  getFallbackGoal,
  listFallbackMilestones,
  normalizeMilestoneStatus,
  parseOptionalDate,
  parsePriority,
} from '@/server/careerPlanning';

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function demoJson(data: unknown): NextResponse {
  const response = NextResponse.json(data);
  response.headers.set('X-Kairos-Demo', '1');
  return response;
}

function completionValue(body: Record<string, unknown>, fallback = 'pending'): string {
  if (typeof body.completed === 'boolean') return body.completed ? 'completed' : 'pending';
  return normalizeMilestoneStatus(body.status, fallback);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id: goalId } = await params;
    if (!goalId) return badRequest('목표 ID가 필요합니다.');

    const db = getDb();
    if (!db) {
      return getFallbackGoal(session.userId, goalId)
        ? demoJson(listFallbackMilestones(session.userId, goalId))
        : notFound('목표를 찾을 수 없거나 권한이 없습니다.');
    }

    const [goal] = await db
      .select({ id: careerGoals.id })
      .from(careerGoals)
      .where(and(eq(careerGoals.id, goalId), eq(careerGoals.userId, session.userId)));
    if (!goal) return notFound('목표를 찾을 수 없거나 권한이 없습니다.');

    const milestones = await db
      .select()
      .from(careerMilestones)
      .where(and(eq(careerMilestones.goalId, goalId), eq(careerMilestones.userId, session.userId)))
      .orderBy(asc(careerMilestones.sortOrder), asc(careerMilestones.createdAt));
    return NextResponse.json(milestones);
  } catch (err: unknown) {
    return internalError(err, '마일스톤을 불러오지 못했습니다.');
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id: goalId } = await params;
    if (!goalId) return badRequest('목표 ID가 필요합니다.');

    let body: Record<string, unknown>;
    try {
      body = await req.json() as Record<string, unknown>;
    } catch {
      return badRequest('요청 본문이 올바르지 않습니다.');
    }
    if (!body || Array.isArray(body)) return badRequest('요청 본문이 올바르지 않습니다.');
    const title = text(body.title, 255);
    if (!title) return badRequest('마일스톤 제목을 입력해주세요.');
    if (body.status !== undefined && !['pending', 'completed', 'skipped'].includes(String(body.status).toLowerCase())) {
      return badRequest('마일스톤 상태가 올바르지 않습니다.');
    }
    const dueDate = Object.prototype.hasOwnProperty.call(body, 'dueDate') ? parseOptionalDate(body.dueDate) : null;
    if (Object.prototype.hasOwnProperty.call(body, 'dueDate') && dueDate === undefined) {
      return badRequest('마일스톤 날짜 형식이 올바르지 않습니다.');
    }
    const status = completionValue(body);
    const completedAt = status === 'completed' ? new Date() : null;
    const sortOrder = parsePriority(body.sortOrder);
    const db = getDb();

    if (!db) {
      if (!getFallbackGoal(session.userId, goalId)) return notFound('목표를 찾을 수 없거나 권한이 없습니다.');
      return demoJson(createFallbackMilestone({
        goalId,
        userId: session.userId,
        title,
        description: text(body.description, 2_000) || null,
        status,
        sortOrder,
        dueDate: dueDate instanceof Date ? dueDate.toISOString() : null,
        completedAt: completedAt?.toISOString() ?? null,
      }));
    }

    const [goal] = await db
      .select({ id: careerGoals.id })
      .from(careerGoals)
      .where(and(eq(careerGoals.id, goalId), eq(careerGoals.userId, session.userId)));
    if (!goal) return notFound('목표를 찾을 수 없거나 권한이 없습니다.');

    const [milestone] = await db
      .insert(careerMilestones)
      .values({
        goalId,
        userId: session.userId,
        title,
        description: text(body.description, 2_000) || null,
        status,
        sortOrder,
        dueDate: dueDate instanceof Date ? dueDate : null,
        completedAt,
      })
      .returning();
    return NextResponse.json(milestone);
  } catch (err: unknown) {
    return internalError(err, '마일스톤을 저장하지 못했습니다.');
  }
}
