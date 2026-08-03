import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { careerDiaryEntries } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, unauthorized } from '@/server/http';
import {
  deleteFallbackDiary,
  listFallbackDiary,
  parseDate,
  parseOptionalDate,
  toStringArray,
  updateFallbackDiary,
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id } = await params;
    if (!id) return badRequest('일기 ID가 필요합니다.');
    const db = getDb();
    if (!db) {
      const entry = listFallbackDiary(session.userId).find((item) => item.id === id);
      return entry ? demoJson(entry) : notFound('일기를 찾을 수 없거나 권한이 없습니다.');
    }
    const [entry] = await db
      .select()
      .from(careerDiaryEntries)
      .where(and(eq(careerDiaryEntries.id, id), eq(careerDiaryEntries.userId, session.userId)));
    return entry ? NextResponse.json(entry) : notFound('일기를 찾을 수 없거나 권한이 없습니다.');
  } catch (err: unknown) {
    return internalError(err, '경력 일기를 불러오지 못했습니다.');
  }
}

async function updateDiary(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id } = await params;
    if (!id) return badRequest('일기 ID가 필요합니다.');

    let body: Record<string, unknown>;
    try {
      body = await req.json() as Record<string, unknown>;
    } catch {
      return badRequest('요청 본문이 올바르지 않습니다.');
    }
    if (!body || Array.isArray(body)) return badRequest('요청 본문이 올바르지 않습니다.');

    const patch: {
      entryType?: string;
      title?: string | null;
      content?: string;
      tags?: string[];
      occurredAt?: Date;
    } = {};

    if (Object.prototype.hasOwnProperty.call(body, 'entryType')) {
      const entryType = text(body.entryType, 50);
      if (!entryType) return badRequest('기록 유형을 입력해주세요.');
      patch.entryType = entryType;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'title')) {
      patch.title = text(body.title, 255) || null;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'content')) {
      const content = text(body.content, MAX_CONTENT_LENGTH);
      if (!content) return badRequest('내용을 입력해주세요.');
      patch.content = content;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'tags')) {
      patch.tags = toStringArray(body.tags, 20, 80);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'occurredAt') || Object.prototype.hasOwnProperty.call(body, 'date')) {
      const rawDate = body.occurredAt ?? body.date;
      const occurredAt = parseOptionalDate(rawDate);
      if (!occurredAt) return badRequest('날짜 형식이 올바르지 않습니다.');
      patch.occurredAt = occurredAt;
    }
    if (Object.keys(patch).length === 0) return badRequest('수정할 항목이 없습니다.');

    const db = getDb();
    if (!db) {
      const fallbackPatch = {
        ...(patch.entryType !== undefined ? { entryType: patch.entryType } : {}),
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.content !== undefined ? { content: patch.content } : {}),
        ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
        ...(patch.occurredAt ? { occurredAt: parseDate(patch.occurredAt).toISOString() } : {}),
      };
      const updated = updateFallbackDiary(session.userId, id, fallbackPatch);
      return updated ? demoJson(updated) : notFound('일기를 찾을 수 없거나 권한이 없습니다.');
    }

    const updated = await db
      .update(careerDiaryEntries)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(careerDiaryEntries.id, id), eq(careerDiaryEntries.userId, session.userId)))
      .returning();

    if (!updated.length) return notFound('일기를 찾을 수 없거나 권한이 없습니다.');
    return NextResponse.json(updated[0]);
  } catch (err: unknown) {
    return internalError(err, '경력 일기를 수정하지 못했습니다.');
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return updateDiary(req, context);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return updateDiary(req, context);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id } = await params;
    if (!id) return badRequest('일기 ID가 필요합니다.');

    const db = getDb();
    if (!db) {
      return deleteFallbackDiary(session.userId, id)
        ? demoJson({ success: true })
        : notFound('일기를 찾을 수 없거나 권한이 없습니다.');
    }

    const deleted = await db
      .delete(careerDiaryEntries)
      .where(and(eq(careerDiaryEntries.id, id), eq(careerDiaryEntries.userId, session.userId)))
      .returning({ id: careerDiaryEntries.id });

    if (!deleted.length) return notFound('일기를 찾을 수 없거나 권한이 없습니다.');
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return internalError(err, '경력 일기를 삭제하지 못했습니다.');
  }
}
