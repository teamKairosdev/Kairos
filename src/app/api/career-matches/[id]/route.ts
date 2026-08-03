import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { careerMatchSuggestions } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, unauthorized } from '@/server/http';
import {
  CAREER_PLANNING_DISCLAIMER,
  deleteFallbackMatch,
  getFallbackMatch,
  updateFallbackMatch,
} from '@/server/careerPlanning';

const RECOMMENDATION_TYPE = 'candidate-job-recommendation';

function demoJson(data: unknown): NextResponse {
  const response = NextResponse.json(data);
  response.headers.set('X-Kairos-Demo', '1');
  return response;
}

function responseSuggestion<T>(suggestion: T) {
  return {
    ...suggestion,
    recommendationType: RECOMMENDATION_TYPE,
    disclaimer: CAREER_PLANNING_DISCLAIMER,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id } = await params;
    if (!id) return badRequest('추천 ID가 필요합니다.');
    const db = getDb();
    if (!db) {
      const item = getFallbackMatch(session.userId, id);
      return item ? demoJson(responseSuggestion(item)) : notFound('추천을 찾을 수 없거나 권한이 없습니다.');
    }
    const [item] = await db
      .select()
      .from(careerMatchSuggestions)
      .where(and(eq(careerMatchSuggestions.id, id), eq(careerMatchSuggestions.userId, session.userId)));
    return item ? NextResponse.json(responseSuggestion(item)) : notFound('추천을 찾을 수 없거나 권한이 없습니다.');
  } catch (err: unknown) {
    return internalError(err, '후보 직무 추천을 불러오지 못했습니다.');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id } = await params;
    if (!id) return badRequest('추천 ID가 필요합니다.');
    let body: { status?: unknown };
    try {
      body = await req.json() as { status?: unknown };
    } catch {
      return badRequest('요청 본문이 올바르지 않습니다.');
    }
    const status = typeof body.status === 'string' ? body.status.trim().toLowerCase() : '';
    if (!['new', 'saved', 'dismissed', 'archived'].includes(status)) {
      return badRequest('추천 상태가 올바르지 않습니다.');
    }

    const db = getDb();
    if (!db) {
      const updated = updateFallbackMatch(session.userId, id, { status });
      return updated ? demoJson(responseSuggestion(updated)) : notFound('추천을 찾을 수 없거나 권한이 없습니다.');
    }
    const [updated] = await db
      .update(careerMatchSuggestions)
      .set({ status })
      .where(and(eq(careerMatchSuggestions.id, id), eq(careerMatchSuggestions.userId, session.userId)))
      .returning();
    return updated ? NextResponse.json(responseSuggestion(updated)) : notFound('추천을 찾을 수 없거나 권한이 없습니다.');
  } catch (err: unknown) {
    return internalError(err, '추천 상태를 수정하지 못했습니다.');
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return PATCH(req, context);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id } = await params;
    if (!id) return badRequest('추천 ID가 필요합니다.');
    const db = getDb();
    if (!db) {
      return deleteFallbackMatch(session.userId, id)
        ? demoJson({ success: true })
        : notFound('추천을 찾을 수 없거나 권한이 없습니다.');
    }
    const deleted = await db
      .delete(careerMatchSuggestions)
      .where(and(eq(careerMatchSuggestions.id, id), eq(careerMatchSuggestions.userId, session.userId)))
      .returning({ id: careerMatchSuggestions.id });
    return deleted.length ? NextResponse.json({ success: true }) : notFound('추천을 찾을 수 없거나 권한이 없습니다.');
  } catch (err: unknown) {
    return internalError(err, '추천을 삭제하지 못했습니다.');
  }
}
