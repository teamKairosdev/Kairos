import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, serviceUnavailable, unauthorized } from '@/server/http';
import { createThreeMonthRoadmap } from '@/server/mentor';

const templateSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  objective: z.string().trim().max(20_000).optional(),
  startDate: z.string().trim().optional(),
  targetDate: z.string().trim().optional(),
});

function parseDate(value: string | undefined): Date | undefined | 'invalid' {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'invalid' : date;
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
    const parsed = templateSchema.safeParse(rawBody);
    if (!parsed.success) return badRequest('템플릿 설정이 올바르지 않습니다.');

    const startDate = parseDate(parsed.data.startDate);
    const targetDate = parseDate(parsed.data.targetDate);
    if (startDate === 'invalid' || targetDate === 'invalid') {
      return badRequest('로드맵 날짜가 올바르지 않습니다.');
    }

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    const created = await createThreeMonthRoadmap(db, session.userId, {
      title: parsed.data.title,
      objective: parsed.data.objective,
      startDate: startDate ?? undefined,
      targetDate: targetDate ?? undefined,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    return internalError(error, '3개월 로드맵을 생성하지 못했습니다.');
  }
}
