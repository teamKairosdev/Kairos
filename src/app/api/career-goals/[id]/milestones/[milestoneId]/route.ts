import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { careerMilestones } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, unauthorized } from '@/server/http';
import {
  completionStatus,
  deleteFallbackMilestone,
  getFallbackMilestone,
  normalizeMilestoneStatus,
  parseOptionalDate,
  parsePriority,
  updateFallbackMilestone,
} from '@/server/careerPlanning';

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function demoJson(data: unknown): NextResponse {
  const response = NextResponse.json(data);
  response.headers.set('X-Kairos-Demo', '1');
  return response;
}

function matchesGoal(item: { goalId: string }, goalId: string): boolean {
  return item.goalId === goalId;
}

async function updateMilestone(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id: goalId, milestoneId } = await params;
    if (!goalId || !milestoneId) return badRequest('마일스톤 ID가 필요합니다.');

    let body: Record<string, unknown>;
    try {
      body = await req.json() as Record<string, unknown>;
    } catch {
      return badRequest('요청 본문이 올바르지 않습니다.');
    }
    if (!body || Array.isArray(body)) return badRequest('요청 본문이 올바르지 않습니다.');

    const db = getDb();
    if (!db) {
      const existing = getFallbackMilestone(session.userId, milestoneId);
      if (!existing || !matchesGoal(existing, goalId)) return notFound('마일스톤을 찾을 수 없거나 권한이 없습니다.');
      const patch: Record<string, unknown> = {};
      if (Object.prototype.hasOwnProperty.call(body, 'title')) {
        const title = text(body.title, 255);
        if (!title) return badRequest('마일스톤 제목을 입력해주세요.');
        patch.title = title;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'description')) patch.description = text(body.description, 2_000) || null;
      if (Object.prototype.hasOwnProperty.call(body, 'sortOrder')) patch.sortOrder = parsePriority(body.sortOrder);
      if (Object.prototype.hasOwnProperty.call(body, 'status') || Object.prototype.hasOwnProperty.call(body, 'completed')) {
        const status = completionStatus(body.completed ?? body.status, existing.status, 'milestone');
        if (status) {
          patch.status = status;
          patch.completedAt = status === 'completed' ? existing.completedAt || new Date().toISOString() : null;
        }
      }
      if (Object.prototype.hasOwnProperty.call(body, 'dueDate')) {
        const date = parseOptionalDate(body.dueDate);
        if (date === undefined) return badRequest('마일스톤 날짜 형식이 올바르지 않습니다.');
        patch.dueDate = date?.toISOString() ?? null;
      }
      if (Object.keys(patch).length === 0) return badRequest('수정할 항목이 없습니다.');
      const updated = updateFallbackMilestone(session.userId, milestoneId, patch);
      return updated && matchesGoal(updated, goalId)
        ? demoJson(updated)
        : notFound('마일스톤을 찾을 수 없거나 권한이 없습니다.');
    }

    const [existing] = await db
      .select()
      .from(careerMilestones)
      .where(and(
        eq(careerMilestones.id, milestoneId),
        eq(careerMilestones.goalId, goalId),
        eq(careerMilestones.userId, session.userId),
      ));
    if (!existing) return notFound('마일스톤을 찾을 수 없거나 권한이 없습니다.');

    const updateData: Partial<typeof careerMilestones.$inferInsert> = { updatedAt: new Date() };
    if (Object.prototype.hasOwnProperty.call(body, 'title')) {
      const title = text(body.title, 255);
      if (!title) return badRequest('마일스톤 제목을 입력해주세요.');
      updateData.title = title;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'description')) updateData.description = text(body.description, 2_000) || null;
    if (Object.prototype.hasOwnProperty.call(body, 'sortOrder')) updateData.sortOrder = parsePriority(body.sortOrder);
    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      if (!['pending', 'completed', 'skipped'].includes(String(body.status).toLowerCase())) {
        return badRequest('마일스톤 상태가 올바르지 않습니다.');
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, 'status') || Object.prototype.hasOwnProperty.call(body, 'completed')) {
      const status = completionStatus(body.completed ?? body.status, existing.status, 'milestone');
      if (status) {
        updateData.status = normalizeMilestoneStatus(status, existing.status);
        updateData.completedAt = status === 'completed' ? existing.completedAt ?? new Date() : null;
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, 'dueDate')) {
      const date = parseOptionalDate(body.dueDate);
      if (date === undefined) return badRequest('마일스톤 날짜 형식이 올바르지 않습니다.');
      updateData.dueDate = date;
    }
    if (Object.keys(updateData).length === 1) return badRequest('수정할 항목이 없습니다.');

    const [updated] = await db
      .update(careerMilestones)
      .set(updateData)
      .where(and(
        eq(careerMilestones.id, milestoneId),
        eq(careerMilestones.goalId, goalId),
        eq(careerMilestones.userId, session.userId),
      ))
      .returning();
    return updated ? NextResponse.json(updated) : notFound('마일스톤을 찾을 수 없거나 권한이 없습니다.');
  } catch (err: unknown) {
    return internalError(err, '마일스톤을 수정하지 못했습니다.');
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id: goalId, milestoneId } = await params;
    if (!goalId || !milestoneId) return badRequest('마일스톤 ID가 필요합니다.');
    const db = getDb();
    if (!db) {
      const item = getFallbackMilestone(session.userId, milestoneId);
      return item && matchesGoal(item, goalId)
        ? demoJson(item)
        : notFound('마일스톤을 찾을 수 없거나 권한이 없습니다.');
    }
    const [item] = await db
      .select()
      .from(careerMilestones)
      .where(and(
        eq(careerMilestones.id, milestoneId),
        eq(careerMilestones.goalId, goalId),
        eq(careerMilestones.userId, session.userId),
      ));
    return item ? NextResponse.json(item) : notFound('마일스톤을 찾을 수 없거나 권한이 없습니다.');
  } catch (err: unknown) {
    return internalError(err, '마일스톤을 불러오지 못했습니다.');
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string; milestoneId: string }> }) {
  return updateMilestone(req, context);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string; milestoneId: string }> }) {
  return updateMilestone(req, context);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id: goalId, milestoneId } = await params;
    if (!goalId || !milestoneId) return badRequest('마일스톤 ID가 필요합니다.');
    const db = getDb();
    if (!db) {
      const item = getFallbackMilestone(session.userId, milestoneId);
      if (!item || !matchesGoal(item, goalId)) return notFound('마일스톤을 찾을 수 없거나 권한이 없습니다.');
      deleteFallbackMilestone(session.userId, milestoneId);
      return demoJson({ success: true });
    }
    const deleted = await db
      .delete(careerMilestones)
      .where(and(
        eq(careerMilestones.id, milestoneId),
        eq(careerMilestones.goalId, goalId),
        eq(careerMilestones.userId, session.userId),
      ))
      .returning({ id: careerMilestones.id });
    return deleted.length ? NextResponse.json({ success: true }) : notFound('마일스톤을 찾을 수 없거나 권한이 없습니다.');
  } catch (err: unknown) {
    return internalError(err, '마일스톤을 삭제하지 못했습니다.');
  }
}
