import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { contextProviders, importedContextItems } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { serializeContextItem } from '../route';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id } = await params;
    if (!id) return badRequest('context item ID가 필요합니다.');

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    const rows = await db
      .select({
        id: importedContextItems.id,
        providerId: importedContextItems.providerId,
        itemType: importedContextItems.itemType,
        title: importedContextItems.title,
        content: importedContextItems.content,
        contentHash: importedContextItems.contentHash,
        sourceReferenceHash: importedContextItems.sourceReferenceHash,
        metadata: importedContextItems.metadata,
        occurredAt: importedContextItems.occurredAt,
        importedAt: importedContextItems.importedAt,
        updatedAt: importedContextItems.updatedAt,
        providerType: contextProviders.providerType,
        providerDisplayName: contextProviders.displayName,
      })
      .from(importedContextItems)
      .innerJoin(
        contextProviders,
        and(eq(importedContextItems.providerId, contextProviders.id), eq(contextProviders.userId, session.userId)),
      )
      .where(and(eq(importedContextItems.id, id), eq(importedContextItems.userId, session.userId)))
      .limit(1);
    if (!rows[0]) return notFound('context item을 찾을 수 없거나 권한이 없습니다.');
    return NextResponse.json(serializeContextItem(rows[0]));
  } catch (err: unknown) {
    return internalError(err, 'context item을 불러오지 못했습니다.');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id } = await params;
    if (!id) return badRequest('context item ID가 필요합니다.');

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    const deleted = await db
      .delete(importedContextItems)
      .where(and(eq(importedContextItems.id, id), eq(importedContextItems.userId, session.userId)))
      .returning({ id: importedContextItems.id });
    if (deleted.length === 0) return notFound('context item을 찾을 수 없거나 권한이 없습니다.');
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    return internalError(err, 'context item을 삭제하지 못했습니다.');
  }
}
