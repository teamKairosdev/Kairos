import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { careerDiaryEntries } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, unauthorized } from '@/server/http';
import {
  createFallbackDiary,
  listFallbackDiary,
  parseDate,
  parseOptionalDate,
  toStringArray,
} from '@/server/careerPlanning';

const MAX_CONTENT_LENGTH = 20_000;

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function demoJson(data: unknown): NextResponse {
  const response = NextResponse.json(data);
  response.headers.set('X-Kairos-Demo', '1');
  return response;
}

function parseEntryType(value: unknown, fallback = 'reflection'): string {
  const entryType = text(value, 50);
  return entryType || fallback;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const db = getDb();
    if (!db) return demoJson(listFallbackDiary(session.userId));

    const entries = await db
      .select()
      .from(careerDiaryEntries)
      .where(eq(careerDiaryEntries.userId, session.userId))
      .orderBy(desc(careerDiaryEntries.occurredAt), desc(careerDiaryEntries.createdAt));

    return NextResponse.json(entries);
  } catch (err: unknown) {
    return internalError(err, '경력 일기를 불러오지 못했습니다.');
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

    const content = text(body.content, MAX_CONTENT_LENGTH);
    if (!content) return badRequest('내용을 입력해주세요.');

    const rawDate = body.occurredAt ?? body.date;
    const parsedDate = parseOptionalDate(rawDate);
    if (rawDate !== undefined && parsedDate === undefined) return badRequest('날짜 형식이 올바르지 않습니다.');
    const occurredAt = parsedDate ?? parseDate(undefined);
    const title = text(body.title, 255) || null;
    const entryType = parseEntryType(body.entryType);
    const tags = toStringArray(body.tags, 20, 80);
    const db = getDb();

    if (!db) {
      return demoJson(createFallbackDiary({
        userId: session.userId,
        entryType,
        title,
        content,
        tags,
        occurredAt: occurredAt.toISOString(),
      }));
    }

    const [entry] = await db
      .insert(careerDiaryEntries)
      .values({
        userId: session.userId,
        entryType,
        title,
        content,
        tags,
        occurredAt,
      })
      .returning();

    return NextResponse.json(entry);
  } catch (err: unknown) {
    return internalError(err, '경력 일기를 저장하지 못했습니다.');
  }
}
