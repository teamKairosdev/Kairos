import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { careers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/server/getSession';
import { generateEmbedding } from '@/server/embedding';
import { unauthorized, badRequest, notFound, serviceUnavailable, internalError } from '@/server/http';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return unauthorized();
    }

    const { id } = await params;
    if (!id) return badRequest('Career ID missing');

    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return badRequest('경력 정보 형식이 올바르지 않습니다.');
    const { company, role, period, description, achievements } = body || {};

    if (typeof company !== 'string' || typeof role !== 'string' || typeof description !== 'string' || !company.trim() || !role.trim() || !description.trim()) {
      return badRequest('회사명, 직무, 주요 설명은 필수 입력 항목입니다.');
    }
    if ((period !== undefined && (typeof period !== 'string' || period.length > 100)) ||
        company.trim().length > 255 || role.trim().length > 255 || description.trim().length > 20_000 ||
        (achievements !== undefined && (!Array.isArray(achievements) || achievements.some((item: unknown) => typeof item !== 'string' || item.length > 1_000)))) {
      return badRequest('경력 정보가 허용된 길이 또는 형식을 벗어났습니다.');
    }

    const db = getDb();
    if (!db) {
      return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    }

    const [ownedCareer] = await db
      .select({ id: careers.id })
      .from(careers)
      .where(and(eq(careers.id, id), eq(careers.userId, session.userId)));
    if (!ownedCareer) return notFound('경력 항목을 찾을 수 없거나 권한이 없습니다.');

    const textToEmbed = `${company.trim()} ${role.trim()}: ${description.trim()} ${(achievements || []).join(' ') || ''}`;
    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(textToEmbed);
    } catch {
      // Keep the source record even when the optional semantic provider is down.
    }

    const updated = await db
      .update(careers)
      .set({
        company: company.trim(),
        role: role.trim(),
        period: typeof period === 'string' && period.trim() ? period.trim().slice(0, 100) : '기타',
        description: description.trim(),
        achievements: achievements || [],
        embedding,
      })
      .where(and(eq(careers.id, id), eq(careers.userId, session.userId)))
      .returning({ id: careers.id });

    if (!updated.length) {
      return notFound('경력 항목을 찾을 수 없거나 권한이 없습니다.');
    }

    return NextResponse.json({ id: updated[0].id });
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return unauthorized();
    }

    const { id } = await params;
    if (!id) return badRequest('Career ID missing');

    const db = getDb();
    if (!db) {
      return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    }

    const deleted = await db
      .delete(careers)
      .where(and(eq(careers.id, id), eq(careers.userId, session.userId)))
      .returning();

    if (!deleted.length) {
      return notFound('경력 항목을 찾을 수 없거나 권한이 없습니다.');
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}
