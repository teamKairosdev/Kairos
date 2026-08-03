import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { getDb } from '@/db';
import { contextProviders, importedContextItems } from '@/db/schema';
import { getSession } from '@/server/getSession';
import {
  ContextImportError,
  ContextPayloadTooLargeError,
  contentHash,
  deriveProviderStatus,
  getProviderDefinition,
  isContextConnectionMode,
  isContextImportFormat,
  isContextProviderType,
  MAX_CONTEXT_ITEMS_PER_IMPORT,
  MAX_CONTEXT_SEARCH_LENGTH,
  normalizeContent,
  officialApiConfigured,
  parseContextImport,
  readLimitedJsonBody,
  redactSecretText,
  sanitizeContextItemForStorage,
  sanitizeForExport,
  sourceReferenceHash,
  type ContextConnectionMode,
  type ContextProviderType,
  type ParsedContextItem,
} from '@/server/contexts';
import { badRequest, internalError, notFound, payloadTooLarge, serviceUnavailable, unauthorized } from '@/server/http';
import { serializeContextProvider } from '../providers/route';

export interface ContextItemsRequestBody {
  providerId?: unknown;
  providerType?: unknown;
  consentScope?: unknown;
  format?: unknown;
  content?: unknown;
  items?: unknown;
  title?: unknown;
  itemType?: unknown;
  sourceReference?: unknown;
  occurredAt?: unknown;
  metadata?: unknown;
}

export class ContextItemsError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 413 | 503 = 400,
  ) {
    super(message);
    this.name = 'ContextItemsError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseConsentScope(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  return values
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => redactSecretText(entry.trim()).slice(0, 160))
    .filter(Boolean)
    .slice(0, 10);
}

const DEFAULT_CONSENT_SCOPE = ['provider metadata', 'user-selected context items', 'user-requested export'];

function safeConsentScope(value: unknown): string[] {
  const parsed = parseConsentScope(value);
  return parsed.length > 0 ? parsed : [...DEFAULT_CONSENT_SCOPE];
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const result = new Date(value);
  return Number.isNaN(result.getTime()) ? null : result;
}

function asText(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value === undefined || value === null) return null;
  return JSON.stringify(value, null, 2);
}

function applyOverrides(
  item: ParsedContextItem,
  body: ContextItemsRequestBody,
  index: number,
): ParsedContextItem {
  const title = typeof body.title === 'string' && body.title.trim() && index === 0
    ? body.title.trim().slice(0, 255)
    : item.title?.slice(0, 255) || null;
  const itemType = typeof body.itemType === 'string' && body.itemType.trim()
    ? body.itemType.trim().replace(/[\r\n]/g, ' ').slice(0, 50)
    : item.itemType.slice(0, 50);
  const sourceReference = typeof body.sourceReference === 'string' && body.sourceReference.trim()
    ? body.sourceReference.trim()
    : item.sourceReference;
  const occurredAt = body.occurredAt === undefined ? item.occurredAt : parseDate(body.occurredAt)?.toISOString() ?? null;
  const metadata = isRecord(body.metadata) ? { ...item.metadata, ...body.metadata } : item.metadata;

  return {
    itemType,
    title,
    content: normalizeContent(item.content),
    sourceReference,
    occurredAt,
    metadata,
  };
}

async function resolveProvider(
  userId: string,
  payload: ContextItemsRequestBody,
) {
  const db = getDb();
  if (!db) throw new ContextItemsError('데이터베이스에 연결할 수 없습니다.', 503);

  if (typeof payload.providerId === 'string' && payload.providerId.trim()) {
    const rows = await db
      .select()
      .from(contextProviders)
      .where(and(eq(contextProviders.id, payload.providerId), eq(contextProviders.userId, userId)))
      .limit(1);
    if (!rows[0]) throw new ContextItemsError('provider를 찾을 수 없거나 권한이 없습니다.', 404);
    return { db, provider: rows[0] };
  }

  if (!isContextProviderType(payload.providerType)) {
    throw new ContextItemsError('providerId 또는 지원하는 providerType이 필요합니다.');
  }
  const providerType: ContextProviderType = payload.providerType;
  const consentScope = safeConsentScope(payload.consentScope);

  const existing = await db
    .select()
    .from(contextProviders)
    .where(and(eq(contextProviders.userId, userId), eq(contextProviders.providerType, providerType)))
    .limit(1);
  if (existing[0]) return { db, provider: existing[0] };

  const now = new Date();
  const definition = getProviderDefinition(providerType);
  const [created] = await db
    .insert(contextProviders)
    .values({
      userId,
      providerType,
      displayName: definition?.label || providerType,
      status: 'import_only',
      externalAccountHash: null,
      credentialRef: null,
      settings: {
        connectionMode: 'file_import',
        consentScope,
        consentGrantedAt: now.toISOString(),
        importFormats: ['json', 'markdown', 'text'],
        officialApiConfigured: false,
      },
      lastSyncedAt: null,
      lastErrorCode: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!created) throw new ContextItemsError('파일 import provider를 등록하지 못했습니다.', 503);
  return { db, provider: created };
}

export async function saveParsedContextItems(
  userId: string,
  payload: ContextItemsRequestBody,
  parsedItems: readonly ParsedContextItem[],
) {
  if (parsedItems.length === 0) throw new ContextItemsError('가져올 context item이 없습니다.');
  if (parsedItems.length > MAX_CONTEXT_ITEMS_PER_IMPORT) {
    throw new ContextItemsError(`한 번에 ${MAX_CONTEXT_ITEMS_PER_IMPORT}개 이하의 항목만 가져올 수 있습니다.`);
  }

  const { db, provider } = await resolveProvider(userId, payload);
  const providerType = isContextProviderType(provider.providerType) ? provider.providerType : null;
  if (!providerType) throw new ContextItemsError('지원하지 않는 provider 유형입니다.');

  const settings = provider.settings as Record<string, unknown>;
  const connectionMode: ContextConnectionMode = isContextConnectionMode(settings.connectionMode)
    ? settings.connectionMode
    : 'file_import';
  const now = new Date();
  const consentGrantedAt = typeof settings.consentGrantedAt === 'string' && !Number.isNaN(new Date(settings.consentGrantedAt).getTime())
    ? new Date(settings.consentGrantedAt).toISOString()
    : now.toISOString();
  const values = parsedItems.map((rawItem, index) => {
    const item = sanitizeContextItemForStorage(applyOverrides(rawItem, payload, index));
    if (!item.content) throw new ContextItemsError('context 내용이 비어 있습니다.');
    const hash = contentHash(item.content);
    const reference = item.sourceReference || `${providerType}:manual:${hash}`;
    return {
      providerId: provider.id,
      userId,
      itemType: item.itemType || 'text',
      title: item.title,
      content: item.content,
      contentHash: hash,
      sourceReferenceHash: sourceReferenceHash(reference),
      metadata: sanitizeForExport(item.metadata) as Record<string, unknown>,
      occurredAt: parseDate(item.occurredAt),
      importedAt: now,
      updatedAt: now,
    };
  });

  const inserted = await db.insert(importedContextItems).values(values).returning();
  const providerStatus = deriveProviderStatus(providerType, connectionMode, provider.status === 'paused' ? 'paused' : undefined);
  const [updatedProvider] = await db
    .update(contextProviders)
    .set({
      status: providerStatus,
      settings: {
        connectionMode,
        consentScope: safeConsentScope(settings.consentScope),
        consentGrantedAt,
        importFormats: ['json', 'markdown', 'text'],
        officialApiConfigured: officialApiConfigured(providerType),
      },
      lastSyncedAt: now,
      lastErrorCode: connectionMode === 'official_api' ? provider.lastErrorCode : null,
      updatedAt: now,
    })
    .where(and(eq(contextProviders.id, provider.id), eq(contextProviders.userId, userId)))
    .returning();

  return {
    provider: updatedProvider || provider,
    items: inserted,
  };
}

export function serializeContextItem(row: {
  id: string;
  providerId: string;
  userId?: string;
  itemType: string;
  title: string | null;
  content: string;
  contentHash: string;
  sourceReferenceHash: string | null;
  metadata: Record<string, unknown>;
  occurredAt: Date | null;
  importedAt: Date;
  updatedAt: Date;
  providerType: string;
  providerDisplayName: string | null;
}) {
  return {
    id: row.id,
    providerId: row.providerId,
    providerType: row.providerType,
    providerDisplayName: row.providerDisplayName ? redactSecretText(row.providerDisplayName) : null,
    itemType: row.itemType,
    title: row.title ? redactSecretText(row.title) : null,
    content: redactSecretText(row.content),
    contentHash: row.contentHash,
    sourceReferenceHash: row.sourceReferenceHash,
    metadata: sanitizeForExport(row.metadata) as Record<string, unknown>,
    occurredAt: row.occurredAt,
    importedAt: row.importedAt,
    updatedAt: row.updatedAt,
  };
}

async function parseRequestBody(req: NextRequest): Promise<ContextItemsRequestBody> {
  const body = await readLimitedJsonBody(req);
  return body && isRecord(body) ? body : {};
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    const queryValue = (
      req.nextUrl.searchParams.get('q')
      || req.nextUrl.searchParams.get('search')
      || ''
    ).trim().slice(0, MAX_CONTEXT_SEARCH_LENGTH);
    const providerId = req.nextUrl.searchParams.get('providerId')?.trim() || '';
    const limitValue = Number.parseInt(req.nextUrl.searchParams.get('limit') || '100', 10);
    const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 100) : 100;
    const conditions = [eq(importedContextItems.userId, session.userId)];
    if (providerId) conditions.push(eq(importedContextItems.providerId, providerId));
    if (queryValue) {
      const searchCondition = or(
        ilike(importedContextItems.title, `%${queryValue}%`),
        ilike(importedContextItems.content, `%${queryValue}%`),
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    const rows = await db
      .select({
        id: importedContextItems.id,
        providerId: importedContextItems.providerId,
        userId: importedContextItems.userId,
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
      .where(and(...conditions))
      .orderBy(desc(importedContextItems.importedAt))
      .limit(limit);

    return NextResponse.json({
      items: rows.map(serializeContextItem),
      query: queryValue,
      total: rows.length,
    });
  } catch (err: unknown) {
    return internalError(err, 'context item 목록을 불러오지 못했습니다.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const body = await parseRequestBody(req);
    const content = asText(body.content);
    const format = isContextImportFormat(body.format)
      ? body.format
      : typeof body.content === 'object'
        ? 'json'
        : 'text';

    let parsedItems: ParsedContextItem[];
    if (Array.isArray(body.items)) {
      parsedItems = parseContextImport(JSON.stringify(body.items), 'json');
    } else if (content) {
      parsedItems = parseContextImport(content, format, typeof body.title === 'string' ? body.title : null);
    } else {
      return badRequest('content 또는 items가 필요합니다.');
    }

    const saved = await saveParsedContextItems(session.userId, body, parsedItems);
    return NextResponse.json({
      provider: serializeContextProvider(saved.provider),
      items: saved.items,
      importedCount: saved.items.length,
    }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof ContextItemsError) {
      if (err.status === 404) return notFound(err.message);
      if (err.status === 413) return payloadTooLarge(err.message);
      if (err.status === 503) return serviceUnavailable(err.message);
      return badRequest(err.message);
    }
    if (err instanceof ContextImportError) {
      if (err.status === 413) return payloadTooLarge(err.message);
      return badRequest(err.message);
    }
    if (err instanceof ContextPayloadTooLargeError) return payloadTooLarge(err.message);
    return internalError(err, 'context item을 저장하지 못했습니다.');
  }
}
