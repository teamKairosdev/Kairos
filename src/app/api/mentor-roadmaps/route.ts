import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { mentorRoadmaps } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, serviceUnavailable, unauthorized } from '@/server/http';
import { createThreeMonthRoadmap, ROADMAP_STATUSES } from '@/server/mentor';

const roadmapSchema = z.object({
  template: z.string().optional(),
  title: z.string().trim().min(1).max(255).optional(),
  objective: z.string().trim().max(20_000).optional(),
  status: z.enum(ROADMAP_STATUSES).optional(),
  source: z.enum(['mentor', 'user', 'template']).optional(),
  targetDate: z.string().trim().optional(),
  metadata: z.record(z.unknown()).optional(),
});

function parseDate(value: string | undefined): Date | null | 'invalid' {
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

    const roadmaps = await db
      .select()
      .from(mentorRoadmaps)
      .where(eq(mentorRoadmaps.userId, session.userId))
      .orderBy(desc(mentorRoadmaps.updatedAt));
    return NextResponse.json(roadmaps);
  } catch (error: unknown) {
    return internalError(error, '로드맵을 불러오지 못했습니다.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    let rawBody: unknown = {};
    if (req.body) {
      try {
        rawBody = await req.json();
      } catch {
        return badRequest('요청 형식이 올바르지 않습니다.');
      }
    }
    const parsed = roadmapSchema.safeParse(rawBody);
    if (!parsed.success) return badRequest('로드맵 정보가 올바르지 않습니다.');

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    if (parsed.data.template === 'three_month') {
      const targetDate = parseDate(parsed.data.targetDate);
      if (targetDate === 'invalid') return badRequest('목표 날짜가 올바르지 않습니다.');
      const created = await createThreeMonthRoadmap(db, session.userId, {
        title: parsed.data.title,
        objective: parsed.data.objective,
        targetDate: targetDate ?? undefined,
      });
      return NextResponse.json(created, { status: 201 });
    }

    const targetDate = parseDate(parsed.data.targetDate);
    if (targetDate === 'invalid') return badRequest('목표 날짜가 올바르지 않습니다.');

    const [roadmap] = await db
      .insert(mentorRoadmaps)
      .values({
        userId: session.userId,
        title: parsed.data.title || '새 취업 준비 로드맵',
        objective: parsed.data.objective || null,
        status: parsed.data.status || 'active',
        source: parsed.data.source || 'user',
        targetDate: targetDate ?? null,
        metadata: parsed.data.metadata || {},
      })
      .returning();

    if (!roadmap) return internalError(new Error('empty insert result'), '로드맵을 생성하지 못했습니다.');
    return NextResponse.json(roadmap, { status: 201 });
  } catch (error: unknown) {
    return internalError(error, '로드맵을 생성하지 못했습니다.');
  }
}
