import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { contextProviders, importedContextItems } from '@/db/schema';
import { getSession } from '@/server/getSession';
import {
  ContextPayloadTooLargeError,
  MAX_CONTEXT_PROVIDER_REQUEST_BYTES,
  contentHash,
  isContextConnectionMode,
  deriveProviderStatus,
  readLimitedJsonBody,
  sanitizeContextItemForStorage,
  sanitizeForExport,
  sourceReferenceHash,
} from '@/server/contexts';
import {
  PrivateProviderError,
  fetchPrivateProvider,
  isPrivateProviderType,
  privateApiConfigured,
  type PrivateProviderType,
} from '@/server/privateProviders';
import {
  PublicProviderError,
  PUBLIC_PROVIDER_MAX_RESPONSE_BYTES,
  PUBLIC_PROVIDER_TIMEOUT_MS,
  derivePublicProviderStatus,
  fetchPublicProvider,
  isPublicProviderType,
  publicApiConfigured,
  type PublicProviderType,
} from '@/server/publicProviders';
import { isRegisteredProviderType } from '../providers/route';
import { badRequest, forbidden, internalError, notFound, payloadTooLarge, serviceUnavailable, unauthorized } from '@/server/http';

interface SyncRequestBody {
  providerId?: unknown;
  providerType?: unknown;
}

interface SyncResult {
  providerId: string;
  providerType: string;
  status: 'synced' | 'configuration_required' | 'skipped' | 'error';
  providerStatus: string;
  fetchedCount: number;
  importedCount: number;
  lastSyncedAt: string;
  errorCode: string | null;
  items?: Array<{
    id: string;
    title: string | null;
    content: string;
    contentHash: string;
    sourceReferenceHash: string | null;
    occurredAt: Date | null;
  }>;
}

type SyncProviderType = PublicProviderType | PrivateProviderType;

function isSyncProviderType(value: unknown): value is SyncProviderType {
  return isPublicProviderType(value) || isPrivateProviderType(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function settingsOf(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function hasConsent(settings: Record<string, unknown>): boolean {
  if (settings.consentGranted === false) return false;
  return settings.consentGranted === true || (
    typeof settings.consentGrantedAt === 'string'
    && !Number.isNaN(new Date(settings.consentGrantedAt).getTime())
  );
}

function connectionMode(settings: Record<string, unknown>): 'official_api' | 'file_import' {
  return isContextConnectionMode(settings.connectionMode) ? settings.connectionMode : 'official_api';
}

function parseOccurredAt(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function errorCode(error: unknown): string {
  if (error instanceof PublicProviderError || error instanceof PrivateProviderError) return error.code;
  return 'SYNC_FAILED';
}

function providerApiConfigured(providerType: SyncProviderType): boolean {
  return isPublicProviderType(providerType) ? publicApiConfigured(providerType) : privateApiConfigured(providerType);
}

function providerStatus(providerType: SyncProviderType, mode: 'official_api' | 'file_import', currentStatus?: string | null) {
  return isPublicProviderType(providerType)
    ? derivePublicProviderStatus(providerType, mode, currentStatus)
    : deriveProviderStatus(providerType, mode, currentStatus);
}

function syncSettings(
  settings: Record<string, unknown>,
  status: string,
  attemptedAt: Date,
): Record<string, unknown> {
  return {
    ...settings,
    syncTimeoutMs: PUBLIC_PROVIDER_TIMEOUT_MS,
    syncMaxResponseBytes: PUBLIC_PROVIDER_MAX_RESPONSE_BYTES,
    lastSyncStatus: status,
    lastSyncAttemptedAt: attemptedAt.toISOString(),
  };
}

async function updateOwnedProvider(
  db: NonNullable<ReturnType<typeof getDb>>,
  provider: typeof contextProviders.$inferSelect,
  userId: string,
  values: {
    status: string;
    lastErrorCode: string | null;
    lastSyncedAt: Date;
    settings: Record<string, unknown>;
    updatedAt: Date;
  },
) {
  const [updated] = await db
    .update(contextProviders)
    .set(values)
    .where(and(eq(contextProviders.id, provider.id), eq(contextProviders.userId, userId)))
    .returning();
  return updated || provider;
}

async function syncOneProvider(
  db: NonNullable<ReturnType<typeof getDb>>,
  provider: typeof contextProviders.$inferSelect,
  userId: string,
): Promise<SyncResult> {
  const attemptedAt = new Date();
  const providerType = provider.providerType as SyncProviderType;
  const settings = settingsOf(provider.settings);
  const mode = connectionMode(settings);

  if (mode !== 'official_api') {
    const updated = await updateOwnedProvider(db, provider, userId, {
      status: 'import_only',
      lastErrorCode: 'CONNECTION_MODE_NOT_OFFICIAL',
      lastSyncedAt: attemptedAt,
      settings: syncSettings(settings, 'skipped', attemptedAt),
      updatedAt: attemptedAt,
    });
    return {
      providerId: provider.id,
      providerType,
      status: 'skipped',
      providerStatus: updated.status,
      fetchedCount: 0,
      importedCount: 0,
      lastSyncedAt: attemptedAt.toISOString(),
      errorCode: 'CONNECTION_MODE_NOT_OFFICIAL',
    };
  }

  if (provider.status === 'paused') {
    const updated = await updateOwnedProvider(db, provider, userId, {
      status: 'paused',
      lastErrorCode: 'PROVIDER_PAUSED',
      lastSyncedAt: attemptedAt,
      settings: syncSettings(settings, 'skipped', attemptedAt),
      updatedAt: attemptedAt,
    });
    return {
      providerId: provider.id,
      providerType,
      status: 'skipped',
      providerStatus: updated.status,
      fetchedCount: 0,
      importedCount: 0,
      lastSyncedAt: attemptedAt.toISOString(),
      errorCode: 'PROVIDER_PAUSED',
    };
  }

  if (!providerApiConfigured(providerType)) {
    const updated = await updateOwnedProvider(db, provider, userId, {
      status: 'not_connected',
      lastErrorCode: 'CONFIGURATION_REQUIRED',
      lastSyncedAt: attemptedAt,
      settings: syncSettings(settings, 'configuration_required', attemptedAt),
      updatedAt: attemptedAt,
    });
    return {
      providerId: provider.id,
      providerType,
      status: 'configuration_required',
      providerStatus: updated.status,
      fetchedCount: 0,
      importedCount: 0,
      lastSyncedAt: attemptedAt.toISOString(),
      errorCode: 'CONFIGURATION_REQUIRED',
    };
  }

  try {
    const fetched = isPublicProviderType(providerType)
      ? await fetchPublicProvider(providerType, { now: attemptedAt })
      : await fetchPrivateProvider(providerType, { now: attemptedAt });
    const candidates = fetched.items
      .map((item) => sanitizeContextItemForStorage(item))
      .filter((item) => Boolean(item.content));

    const existing = await db
      .select({
        contentHash: importedContextItems.contentHash,
        sourceReferenceHash: importedContextItems.sourceReferenceHash,
      })
      .from(importedContextItems)
      .where(and(eq(importedContextItems.providerId, provider.id), eq(importedContextItems.userId, userId)));
    const existingKeys = new Set(
      existing.flatMap((item) => [
        item.sourceReferenceHash ? `source:${item.sourceReferenceHash}` : null,
        item.contentHash ? `content:${item.contentHash}` : null,
      ].filter((value): value is string => Boolean(value))),
    );

    const values = candidates.flatMap((item) => {
      const hash = contentHash(item.content);
      const reference = item.sourceReference || `${providerType}:auto:${hash}`;
      const referenceHash = sourceReferenceHash(reference);
      const keys = [`source:${referenceHash}`, `content:${hash}`];
      if (keys.some((key) => existingKeys.has(key))) return [];
      keys.forEach((key) => existingKeys.add(key));
      return [{
        providerId: provider.id,
        userId,
        itemType: item.itemType || providerType,
        title: item.title,
        content: item.content,
        contentHash: hash,
        sourceReferenceHash: referenceHash,
        metadata: sanitizeForExport(item.metadata) as Record<string, unknown>,
        occurredAt: parseOccurredAt(item.occurredAt),
        importedAt: attemptedAt,
        updatedAt: attemptedAt,
      }];
    });

    const inserted = values.length > 0
      ? await db.insert(importedContextItems).values(values).returning()
      : [];
    const updated = await updateOwnedProvider(db, provider, userId, {
      status: providerStatus(providerType, mode, provider.status === 'paused' ? 'paused' : undefined),
      lastErrorCode: null,
      lastSyncedAt: attemptedAt,
      settings: syncSettings(settings, 'synced', attemptedAt),
      updatedAt: attemptedAt,
    });

    return {
      providerId: provider.id,
      providerType,
      status: 'synced',
      providerStatus: updated.status,
      fetchedCount: fetched.items.length,
      importedCount: inserted.length,
      lastSyncedAt: attemptedAt.toISOString(),
      errorCode: null,
      items: inserted.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        contentHash: item.contentHash,
        sourceReferenceHash: item.sourceReferenceHash,
        occurredAt: item.occurredAt,
      })),
    };
  } catch (error: unknown) {
    const code = errorCode(error);
    const updated = await updateOwnedProvider(db, provider, userId, {
      status: 'error',
      lastErrorCode: code,
      lastSyncedAt: attemptedAt,
      settings: syncSettings(settings, 'error', attemptedAt),
      updatedAt: attemptedAt,
    });
    return {
      providerId: provider.id,
      providerType,
      status: 'error',
      providerStatus: updated.status,
      fetchedCount: 0,
      importedCount: 0,
      lastSyncedAt: attemptedAt.toISOString(),
      errorCode: code,
    };
  }
}

async function ownedProviders(
  db: NonNullable<ReturnType<typeof getDb>>,
  userId: string,
  body: SyncRequestBody,
) {
  const providerId = typeof body.providerId === 'string' ? body.providerId.trim() : '';
  const providerType = body.providerType === undefined ? null : body.providerType;
  if (providerType !== null && !isSyncProviderType(providerType)) {
    throw new Error('지원하는 providerType이 필요합니다.');
  }

  if (providerId) {
    return db
      .select()
      .from(contextProviders)
      .where(and(eq(contextProviders.id, providerId), eq(contextProviders.userId, userId)))
      .limit(1);
  }
  if (providerType) {
    return db
      .select()
      .from(contextProviders)
      .where(and(eq(contextProviders.providerType, providerType), eq(contextProviders.userId, userId)))
      .limit(1);
  }
  return db
    .select()
    .from(contextProviders)
    .where(eq(contextProviders.userId, userId));
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const parsedBody = await readLimitedJsonBody(req, MAX_CONTEXT_PROVIDER_REQUEST_BYTES);
    if (parsedBody !== null && !isRecord(parsedBody)) return badRequest('요청 본문이 올바르지 않습니다.');
    const body = (parsedBody || {}) as SyncRequestBody;
    if (body.providerId !== undefined && typeof body.providerId !== 'string') {
      return badRequest('providerId는 문자열이어야 합니다.');
    }
    if (body.providerType !== undefined && !isSyncProviderType(body.providerType)) {
      return badRequest('providerType은 notion, github, worknet, employment24, qnet, dart 중 하나여야 합니다.');
    }

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    const providers = await ownedProviders(db, session.userId, body);
    if (typeof body.providerId === 'string' || body.providerType !== undefined) {
      if (!providers[0]) return notFound('provider를 찾을 수 없거나 권한이 없습니다.');
      if (!isRegisteredProviderType(providers[0].providerType) || !isSyncProviderType(providers[0].providerType)) {
        return badRequest('공식 API 동기화 대상 provider가 아닙니다.');
      }
    }

    const syncProviders = providers.filter((provider) => isSyncProviderType(provider.providerType));
    if (syncProviders.some((provider) => !hasConsent(settingsOf(provider.settings)))) {
      return forbidden('공식 API 동기화에 대한 사용자 동의가 필요합니다.');
    }

    const results: SyncResult[] = [];
    for (const provider of syncProviders) {
      results.push(await syncOneProvider(db, provider, session.userId));
    }

    return NextResponse.json({
      requestedAt: new Date().toISOString(),
      providers: results,
      syncedCount: results.filter((result) => result.status === 'synced').length,
      importedCount: results.reduce((total, result) => total + result.importedCount, 0),
    });
  } catch (error: unknown) {
    if (error instanceof ContextPayloadTooLargeError) return payloadTooLarge(error.message);
    if (error instanceof Error && error.message.includes('providerType')) return badRequest(error.message);
    return internalError(error, '공식 API context 동기화에 실패했습니다.');
  }
}
