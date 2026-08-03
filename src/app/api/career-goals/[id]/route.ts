import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { careerGoals, careerMilestones } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, unauthorized } from '@/server/http';
import {
  completionStatus,
  deleteFallbackGoal,
  getFallbackGoal,
  mergeGoalMetadata,
  normalizeGoalStatus,
  parseOptionalDate,
  parsePriority,
  toStringArray,
  updateFallbackGoal,
} from '@/server/careerPlanning';

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function demoJson(data: unknown): NextResponse {
  const response = NextResponse.json(data);
  response.headers.set('X-Kairos-Demo', '1');
  return response;
}

function statusIsValid(value: unknown): boolean {
  return value === undefined || ['active', 'completed', 'archived'].includes(String(value).toLowerCase());
}

async function updateGoal(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id } = await params;
    if (!id) return badRequest('목표 ID가 필요합니다.');

    let body: Record<string, unknown>;
    try {
      body = await req.json() as Record<string, unknown>;
    } catch {
      return badRequest('요청 본문이 올바르지 않습니다.');
    }
    if (!body || Array.isArray(body)) return badRequest('요청 본문이 올바르지 않습니다.');
    if (Object.prototype.hasOwnProperty.call(body, 'status') && !statusIsValid(body.status)) {
      return badRequest('목표 상태가 올바르지 않습니다.');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'completed') && typeof body.completed !== 'boolean') {
      return badRequest('완료 여부가 올바르지 않습니다.');
    }

    const db = getDb();
    if (!db) {
      const existing = getFallbackGoal(session.userId, id);
      if (!existing) return notFound('목표를 찾을 수 없거나 권한이 없습니다.');

      const patch: Record<string, unknown> = {};
      if (Object.prototype.hasOwnProperty.call(body, 'title')) {
        const title = text(body.title, 255);
        if (!title) return badRequest('목표 제목을 입력해주세요.');
        patch.title = title;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'description')) patch.description = text(body.description, 5_000) || null;
      if (Object.prototype.hasOwnProperty.call(body, 'priority')) patch.priority = parsePriority(body.priority);
      if (Object.prototype.hasOwnProperty.call(body, 'status') || Object.prototype.hasOwnProperty.call(body, 'completed')) {
        const status = completionStatus(body.completed ?? body.status, existing.status, 'goal');
        if (status) patch.status = status;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'targetDate')) {
        const date = parseOptionalDate(body.targetDate);
        if (date === undefined) return badRequest('목표 날짜 형식이 올바르지 않습니다.');
        patch.targetDate = date?.toISOString() ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'metadata') || Object.prototype.hasOwnProperty.call(body, 'keywords')) {
        const incoming = typeof body.metadata === 'object' && body.metadata !== null && !Array.isArray(body.metadata)
          ? { ...(body.metadata as Record<string, unknown>) }
          : {};
        if (Object.prototype.hasOwnProperty.call(body, 'metadata') && (typeof body.metadata !== 'object' || body.metadata === null || Array.isArray(body.metadata))) {
          return badRequest('목표 부가 데이터는 객체여야 합니다.');
        }
        if (Object.prototype.hasOwnProperty.call(body, 'keywords')) incoming.keywords = toStringArray(body.keywords, 30, 80);
        const metadata = mergeGoalMetadata(existing.metadata, incoming);
        if (metadata.error || !metadata.value) return badRequest(metadata.error || '목표 부가 데이터를 확인해주세요.');
        patch.metadata = metadata.value;
      }
      if (Object.keys(patch).length === 0) return badRequest('수정할 항목이 없습니다.');
      const updated = updateFallbackGoal(session.userId, id, patch);
      return updated ? demoJson(updated) : notFound('목표를 찾을 수 없거나 권한이 없습니다.');
    }

    const [existing] = await db
      .select()
      .from(careerGoals)
      .where(and(eq(careerGoals.id, id), eq(careerGoals.userId, session.userId)));
    if (!existing) return notFound('목표를 찾을 수 없거나 권한이 없습니다.');

    const updateData: Partial<typeof careerGoals.$inferInsert> = { updatedAt: new Date() };
    if (Object.prototype.hasOwnProperty.call(body, 'title')) {
      const title = text(body.title, 255);
      if (!title) return badRequest('목표 제목을 입력해주세요.');
      updateData.title = title;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'description')) updateData.description = text(body.description, 5_000) || null;
    if (Object.prototype.hasOwnProperty.call(body, 'priority')) updateData.priority = parsePriority(body.priority);
    if (Object.prototype.hasOwnProperty.call(body, 'status') || Object.prototype.hasOwnProperty.call(body, 'completed')) {
      const status = completionStatus(body.completed ?? body.status, existing.status, 'goal');
      if (status) updateData.status = normalizeGoalStatus(status, existing.status);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'targetDate')) {
      const date = parseOptionalDate(body.targetDate);
      if (date === undefined) return badRequest('목표 날짜 형식이 올바르지 않습니다.');
      updateData.targetDate = date;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'metadata') || Object.prototype.hasOwnProperty.call(body, 'keywords')) {
      const incoming = typeof body.metadata === 'object' && body.metadata !== null && !Array.isArray(body.metadata)
        ? { ...(body.metadata as Record<string, unknown>) }
        : {};
      if (Object.prototype.hasOwnProperty.call(body, 'metadata') && (typeof body.metadata !== 'object' || body.metadata === null || Array.isArray(body.metadata))) {
        return badRequest('목표 부가 데이터는 객체여야 합니다.');
      }
      if (Object.prototype.hasOwnProperty.call(body, 'keywords')) incoming.keywords = toStringArray(body.keywords, 30, 80);
      const metadata = mergeGoalMetadata(existing.metadata, incoming);
      if (metadata.error || !metadata.value) return badRequest(metadata.error || '목표 부가 데이터를 확인해주세요.');
      updateData.metadata = metadata.value;
    }
    if (Object.keys(updateData).length === 1) return badRequest('수정할 항목이 없습니다.');

    const [updated] = await db
      .update(careerGoals)
      .set(updateData)
      .where(and(eq(careerGoals.id, id), eq(careerGoals.userId, session.userId)))
      .returning();
    if (!updated) return notFound('목표를 찾을 수 없거나 권한이 없습니다.');

    const milestones = await db
      .select()
      .from(careerMilestones)
      .where(and(eq(careerMilestones.goalId, id), eq(careerMilestones.userId, session.userId)))
      .orderBy(asc(careerMilestones.sortOrder), asc(careerMilestones.createdAt));
    return NextResponse.json({ ...updated, milestones });
  } catch (err: unknown) {
    return internalError(err, '진로 목표를 수정하지 못했습니다.');
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id } = await params;
    if (!id) return badRequest('목표 ID가 필요합니다.');

    const db = getDb();
    if (!db) {
      const goal = getFallbackGoal(session.userId, id);
      return goal ? demoJson(goal) : notFound('목표를 찾을 수 없거나 권한이 없습니다.');
    }

    const [goal] = await db
      .select()
      .from(careerGoals)
      .where(and(eq(careerGoals.id, id), eq(careerGoals.userId, session.userId)));
    if (!goal) return notFound('목표를 찾을 수 없거나 권한이 없습니다.');
    const milestones = await db
      .select()
      .from(careerMilestones)
      .where(and(eq(careerMilestones.goalId, id), eq(careerMilestones.userId, session.userId)))
      .orderBy(asc(careerMilestones.sortOrder), asc(careerMilestones.createdAt));
    return NextResponse.json({ ...goal, milestones });
  } catch (err: unknown) {
    return internalError(err, '진로 목표를 불러오지 못했습니다.');
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return updateGoal(req, context);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return updateGoal(req, context);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id } = await params;
    if (!id) return badRequest('목표 ID가 필요합니다.');

    const db = getDb();
    if (!db) {
      return deleteFallbackGoal(session.userId, id)
        ? demoJson({ success: true })
        : notFound('목표를 찾을 수 없거나 권한이 없습니다.');
    }

    const deleted = await db
      .delete(careerGoals)
      .where(and(eq(careerGoals.id, id), eq(careerGoals.userId, session.userId)))
      .returning({ id: careerGoals.id });
    if (!deleted.length) return notFound('목표를 찾을 수 없거나 권한이 없습니다.');
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return internalError(err, '진로 목표를 삭제하지 못했습니다.');
  }
}
