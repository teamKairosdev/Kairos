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
    const { company, role, period, description, achievements } = body || {};

    if (!company || !role || !description) {
      return badRequest('회사명, 직무, 주요 설명은 필수 입력 항목입니다.');
    }

    const db = getDb();
    if (!db) {
      return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    }

    const textToEmbed = `${company} ${role}: ${description} ${(achievements || []).join(' ') || ''}`;
    const embedding = await generateEmbedding(textToEmbed);

    const updated = await db
      .update(careers)
      .set({
        company,
        role,
        period: period || '기타',
        description,
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
