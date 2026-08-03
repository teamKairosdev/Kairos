import { NextRequest, NextResponse } from 'next/server';
import { asc, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { careerGoals, careerMilestones } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, unauthorized } from '@/server/http';
import {
  createFallbackGoal,
  listFallbackGoals,
  normalizeGoalStatus,
  parseOptionalDate,
  parsePriority,
  toStringArray,
  validateGoalMetadata,
} from '@/server/careerPlanning';

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function demoJson(data: unknown): NextResponse {
  const response = NextResponse.json(data);
  response.headers.set('X-Kairos-Demo', '1');
  return response;
}

function parseMetadata(body: Record<string, unknown>): { value?: Record<string, unknown>; error?: string } {
  const parsed = validateGoalMetadata(body.metadata ?? {});
  if (parsed.error || !parsed.value) return parsed;
  if (Object.prototype.hasOwnProperty.call(body, 'keywords')) {
    parsed.value.keywords = toStringArray(body.keywords, 30, 80);
  }
  return validateGoalMetadata(parsed.value);
}

function parseTargetDate(body: Record<string, unknown>): Date | null | undefined {
  if (!Object.prototype.hasOwnProperty.call(body, 'targetDate')) return undefined;
  return parseOptionalDate(body.targetDate);
}

function validateStatus(value: unknown): boolean {
  return value === undefined || ['active', 'completed', 'archived'].includes(String(value).toLowerCase());
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const db = getDb();
    if (!db) return demoJson(listFallbackGoals(session.userId));

    const [goals, milestones] = await Promise.all([
      db
        .select()
        .from(careerGoals)
        .where(eq(careerGoals.userId, session.userId))
        .orderBy(desc(careerGoals.createdAt)),
      db
        .select()
        .from(careerMilestones)
        .where(eq(careerMilestones.userId, session.userId))
        .orderBy(asc(careerMilestones.sortOrder), asc(careerMilestones.createdAt)),
    ]);

    const milestonesByGoal = new Map<string, typeof milestones>();
    for (const milestone of milestones) {
      const current = milestonesByGoal.get(milestone.goalId) ?? [];
      current.push(milestone);
      milestonesByGoal.set(milestone.goalId, current);
    }

    return NextResponse.json(goals.map((goal) => ({
      ...goal,
      milestones: milestonesByGoal.get(goal.id) ?? [],
    })));
  } catch (err: unknown) {
    return internalError(err, '진로 목표를 불러오지 못했습니다.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    let body: Record<string, unknown>;
    try {
      body = await req.json() as Record<string, unknown>;
    } catch {
      return badRequest('요청 본문이 올바르지 않습니다.');
    }
    if (!body || Array.isArray(body)) return badRequest('요청 본문이 올바르지 않습니다.');

    const title = text(body.title, 255);
    if (!title) return badRequest('목표 제목을 입력해주세요.');
    if (!validateStatus(body.status)) return badRequest('목표 상태가 올바르지 않습니다.');
    if (body.completed !== undefined && typeof body.completed !== 'boolean') return badRequest('완료 여부가 올바르지 않습니다.');
    const targetDate = parseTargetDate(body);
    if (Object.prototype.hasOwnProperty.call(body, 'targetDate') && targetDate === undefined) {
      return badRequest('목표 날짜 형식이 올바르지 않습니다.');
    }
    const metadata = parseMetadata(body);
    if (metadata.error || !metadata.value) return badRequest(metadata.error || '목표 부가 데이터를 확인해주세요.');

    const data = {
      userId: session.userId,
      title,
      description: text(body.description, 5_000) || null,
      status: normalizeGoalStatus(body.completed === true ? 'completed' : body.status),
      priority: parsePriority(body.priority),
      targetDate: targetDate ?? null,
      metadata: metadata.value,
    };
    const db = getDb();

    if (!db) {
      return demoJson(createFallbackGoal({
        ...data,
        targetDate: data.targetDate?.toISOString() ?? null,
      }));
    }

    const [goal] = await db.insert(careerGoals).values(data).returning();
    return NextResponse.json({ ...goal, milestones: [] });
  } catch (err: unknown) {
    return internalError(err, '진로 목표를 저장하지 못했습니다.');
  }
}
