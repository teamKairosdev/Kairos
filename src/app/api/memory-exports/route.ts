import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { getDb } from '@/db';
import { contextProviders, importedContextItems, memoryExportJobs } from '@/db/schema';
import { getSession } from '@/server/getSession';
import {
  ContextPayloadTooLargeError,
  MAX_CONTEXT_SEARCH_LENGTH,
  MAX_MEMORY_EXPORT_REQUEST_BYTES,
  isMemoryExportFormat,
  readLimitedJsonBody,
  redactSecretText,
  renderContextExport,
  sanitizeForExport,
  writeMemoryExport,
  type ContextExportItem,
  type MemoryExportFormat,
} from '@/server/contexts';
import { badRequest, internalError, notFound, payloadTooLarge, serviceUnavailable, unauthorized } from '@/server/http';

export interface MemoryExportSelection {
  itemIds?: string[];
  providerId?: string;
  q?: string;
}

type ExportDb = NonNullable<ReturnType<typeof getDb>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeSelection(value: unknown): MemoryExportSelection {
  if (!isRecord(value)) return {};
  const itemIds = Array.isArray(value.itemIds)
    ? value.itemIds
      .filter((itemId): itemId is string => typeof itemId === 'string' && itemId.trim().length > 0)
      .map((itemId) => redactSecretText(itemId.trim().slice(0, 128)))
      .slice(0, 500)
    : undefined;
  const providerId = typeof value.providerId === 'string' && value.providerId.trim()
    ? redactSecretText(value.providerId.trim().slice(0, 128))
    : undefined;
  const q = typeof value.q === 'string' && value.q.trim()
    ? redactSecretText(value.q.trim()).slice(0, MAX_CONTEXT_SEARCH_LENGTH)
    : undefined;
  return { itemIds, providerId, q };
}

export function serializeMemoryExportJob(row: typeof memoryExportJobs.$inferSelect) {
  return {
    id: row.id,
    providerId: row.providerId,
    status: row.status,
    format: row.format,
    selection: normalizeSelection(row.selection),
    itemCount: row.itemCount,
    outputRef: row.outputRef,
    errorCode: row.errorCode,
    requestedAt: row.requestedAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}

export async function buildExportContent(
  db: ExportDb,
  userId: string,
  selection: MemoryExportSelection,
  format: MemoryExportFormat,
): Promise<{ content: string; itemCount: number }> {
  const conditions = [eq(importedContextItems.userId, userId)];
  if (selection.providerId) conditions.push(eq(importedContextItems.providerId, selection.providerId));
  if (selection.itemIds && selection.itemIds.length > 0) {
    conditions.push(inArray(importedContextItems.id, selection.itemIds));
  }
  if (selection.q) {
    const searchCondition = or(
      ilike(importedContextItems.title, `%${selection.q}%`),
      ilike(importedContextItems.content, `%${selection.q}%`),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  const rows = await db
    .select({
      id: importedContextItems.id,
      providerType: contextProviders.providerType,
      providerDisplayName: contextProviders.displayName,
      itemType: importedContextItems.itemType,
      title: importedContextItems.title,
      content: importedContextItems.content,
      contentHash: importedContextItems.contentHash,
      sourceReferenceHash: importedContextItems.sourceReferenceHash,
      metadata: importedContextItems.metadata,
      occurredAt: importedContextItems.occurredAt,
      importedAt: importedContextItems.importedAt,
      updatedAt: importedContextItems.updatedAt,
    })
    .from(importedContextItems)
    .innerJoin(
      contextProviders,
      and(eq(importedContextItems.providerId, contextProviders.id), eq(contextProviders.userId, userId)),
    )
    .where(and(...conditions))
    .orderBy(desc(importedContextItems.importedAt));

  const items: ContextExportItem[] = rows.map((row) => ({
    id: row.id,
    providerType: row.providerType,
    providerDisplayName: row.providerDisplayName,
    itemType: row.itemType,
    title: row.title ? redactSecretText(row.title) : null,
    content: redactSecretText(row.content),
    contentHash: row.contentHash,
    sourceReferenceHash: row.sourceReferenceHash,
    metadata: sanitizeForExport(row.metadata) as Record<string, unknown>,
    occurredAt: row.occurredAt,
    importedAt: row.importedAt,
    updatedAt: row.updatedAt,
  }));
  return { content: renderContextExport(format, items), itemCount: items.length };
}

function contentType(format: MemoryExportFormat): string {
  return format === 'json' ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8';
}

function fileResponse(content: string, format: MemoryExportFormat, jobId: string): NextResponse {
  return new NextResponse(content, {
    headers: {
      'Content-Type': contentType(format),
      'Content-Disposition': `attachment; filename="kairos-context-export-${jobId}.${format}"`,
      'Cache-Control': 'private, no-store',
      'X-Memory-Export-Job-Id': jobId,
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    const limitValue = Number.parseInt(req.nextUrl.searchParams.get('limit') || '20', 10);
    const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 50) : 20;
    const rows = await db
      .select()
      .from(memoryExportJobs)
      .where(eq(memoryExportJobs.userId, session.userId))
      .orderBy(desc(memoryExportJobs.requestedAt))
      .limit(limit);
    return NextResponse.json(rows.map(serializeMemoryExportJob));
  } catch (err: unknown) {
    return internalError(err, 'memory export job 목록을 불러오지 못했습니다.');
  }
}

export async function POST(req: NextRequest) {
  let jobId: string | null = null;
  let db: ExportDb | null = null;
  let exportUserId: string | null = null;
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    exportUserId = session.userId;
    const parsedBody = await readLimitedJsonBody(req, MAX_MEMORY_EXPORT_REQUEST_BYTES);
    if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
      return badRequest('요청 본문이 올바르지 않습니다.');
    }
    const body = parsedBody as Record<string, unknown>;

    const formatValue = body.format ?? 'json';
    if (!isMemoryExportFormat(formatValue)) return badRequest('format은 json 또는 markdown이어야 합니다.');
    const format: MemoryExportFormat = formatValue;
    const selectionSource = isRecord(body.selection) ? body.selection : body;
    const selection = normalizeSelection(selectionSource);
    const downloadNow = body.download === true || req.nextUrl.searchParams.get('download') === '1';

    db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    if (selection.providerId) {
      const provider = await db
        .select({ id: contextProviders.id })
        .from(contextProviders)
        .where(and(eq(contextProviders.id, selection.providerId), eq(contextProviders.userId, session.userId)))
        .limit(1);
      if (!provider[0]) return notFound('provider를 찾을 수 없거나 권한이 없습니다.');
    }

    const selectionRecord: Record<string, unknown> = {
      ...(selection.itemIds ? { itemIds: selection.itemIds } : {}),
      ...(selection.providerId ? { providerId: selection.providerId } : {}),
      ...(selection.q ? { q: selection.q } : {}),
    };
    const now = new Date();
    const [created] = await db
      .insert(memoryExportJobs)
      .values({
        userId: session.userId,
        providerId: selection.providerId || null,
        status: 'queued',
        format,
        selection: selectionRecord,
        itemCount: 0,
        outputRef: null,
        errorCode: null,
        requestedAt: now,
        startedAt: null,
        completedAt: null,
      })
      .returning();
    if (!created) return serviceUnavailable('memory export job을 만들지 못했습니다.');
    jobId = created.id;

    const [running] = await db
      .update(memoryExportJobs)
      .set({ status: 'running', startedAt: new Date(), errorCode: null })
      .where(and(eq(memoryExportJobs.id, jobId), eq(memoryExportJobs.userId, session.userId)))
      .returning();
    if (!running) return serviceUnavailable('memory export job을 실행하지 못했습니다.');

    const rendered = await buildExportContent(db, session.userId, selection, format);
    const outputRef = `${jobId}.${format}`;
    writeMemoryExport(outputRef, rendered.content);
    const [completed] = await db
      .update(memoryExportJobs)
      .set({
        status: 'completed',
        itemCount: rendered.itemCount,
        outputRef,
        errorCode: null,
        completedAt: new Date(),
      })
      .where(and(eq(memoryExportJobs.id, jobId), eq(memoryExportJobs.userId, session.userId)))
      .returning();
    if (!completed) return serviceUnavailable('memory export job 완료 상태를 저장하지 못했습니다.');

    if (downloadNow) return fileResponse(rendered.content, format, jobId);
    return NextResponse.json({
      job: serializeMemoryExportJob(completed),
      downloadUrl: `/api/memory-exports/${jobId}`,
    }, { status: 201 });
  } catch (err: unknown) {
    if (db && jobId && exportUserId) {
      try {
        await db
          .update(memoryExportJobs)
          .set({ status: 'failed', errorCode: 'EXPORT_EXECUTION_FAILED', completedAt: new Date() })
          .where(and(eq(memoryExportJobs.id, jobId), eq(memoryExportJobs.userId, exportUserId)));
      } catch {
        // Keep the original export error as the response.
      }
    }
    if (err instanceof ContextPayloadTooLargeError) return payloadTooLarge(err.message);
    return internalError(err, 'memory export를 실행하지 못했습니다.');
  }
}
