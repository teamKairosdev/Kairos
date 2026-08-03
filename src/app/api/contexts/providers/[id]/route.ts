import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { contextProviders } from '@/db/schema';
import { getSession } from '@/server/getSession';
import {
  ContextPayloadTooLargeError,
  MAX_CONTEXT_PROVIDER_REQUEST_BYTES,
  isContextConnectionMode,
  isContextProviderStatus,
  readLimitedJsonBody,
  redactSecretText,
  sha256,
  type ContextConnectionMode,
} from '@/server/contexts';
import { badRequest, internalError, notFound, payloadTooLarge, serviceUnavailable, unauthorized } from '@/server/http';
import {
  isRegisteredProviderType,
  providerApiConfigured,
  providerStatus,
  serializeContextProvider,
} from '../route';
import { isPublicProviderType } from '@/server/publicProviders';

const DEFAULT_CONSENT_SCOPE = ['provider metadata', 'user-selected context items', 'user-requested export'];

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

function safeConsentScope(value: unknown): string[] {
  const parsed = parseConsentScope(value);
  return parsed.length > 0 ? parsed : [...DEFAULT_CONSENT_SCOPE];
}

function hasCredentialInput(value: unknown, depth = 0): boolean {
  if (depth > 3 || !isRecord(value)) return false;
  const secretKeys = new Set(['apikey', 'token', 'secret', 'credentialref', 'accesstoken', 'refreshtoken', 'clientsecret']);
  return Object.entries(value).some(([key, entry]) => {
    const normalizedKey = key.replace(/[^a-zA-Z]/g, '').toLowerCase();
    return secretKeys.has(normalizedKey) || hasCredentialInput(entry, depth + 1);
  });
}

async function findOwnedProvider(id: string, userId: string) {
  const db = getDb();
  if (!db) return { db: null, provider: null };
  const rows = await db
    .select()
    .from(contextProviders)
    .where(and(eq(contextProviders.id, id), eq(contextProviders.userId, userId)))
    .limit(1);
  return { db, provider: rows[0] ?? null };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id } = await params;
    if (!id) return badRequest('provider ID가 필요합니다.');

    const { db, provider } = await findOwnedProvider(id, session.userId);
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    if (!provider) return notFound('provider를 찾을 수 없거나 권한이 없습니다.');
    return NextResponse.json(serializeContextProvider(provider));
  } catch (err: unknown) {
    if (err instanceof ContextPayloadTooLargeError) return payloadTooLarge(err.message);
    return internalError(err, 'context provider를 불러오지 못했습니다.');
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
    if (!id) return badRequest('provider ID가 필요합니다.');

    const parsedBody = await readLimitedJsonBody(req, MAX_CONTEXT_PROVIDER_REQUEST_BYTES);
    if (!isRecord(parsedBody)) return badRequest('요청 본문이 올바르지 않습니다.');
    const body = parsedBody;
    if (hasCredentialInput(body)) {
      return badRequest('API key와 자격 증명 원문은 이 MVP에서 받거나 저장하지 않습니다.');
    }
    if (body.consentGranted !== undefined && body.consentGranted !== true) {
      return badRequest('공식 API 동기화를 위해 provider 사용 동의가 필요합니다.');
    }

    const { db, provider } = await findOwnedProvider(id, session.userId);
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    if (!provider) return notFound('provider를 찾을 수 없거나 권한이 없습니다.');

    const previousSettings = provider.settings as Record<string, unknown>;
    const previousMode: ContextConnectionMode = isContextConnectionMode(previousSettings.connectionMode)
      ? previousSettings.connectionMode
      : 'official_api';
    const connectionMode = body.connectionMode === undefined
      ? previousMode
      : isContextConnectionMode(body.connectionMode)
        ? body.connectionMode
        : null;
    if (!connectionMode) return badRequest('connectionMode는 official_api 또는 file_import이어야 합니다.');

    const consentScope = body.consentScope === undefined
      ? safeConsentScope(previousSettings.consentScope)
      : safeConsentScope(body.consentScope);

    const requestedStatus = body.status;
    if (requestedStatus !== undefined && !isContextProviderStatus(requestedStatus)) {
      return badRequest('지원하지 않는 provider 상태입니다.');
    }

    const displayName = body.displayName === undefined
      ? provider.displayName
      : typeof body.displayName === 'string'
        ? redactSecretText(body.displayName.trim()).slice(0, 160) || provider.displayName
        : null;
    const now = new Date();
    const externalAccountHash = body.externalAccountId === null
      ? null
      : typeof body.externalAccountId === 'string' && body.externalAccountId.trim()
        ? sha256(body.externalAccountId.trim())
        : provider.externalAccountHash;
    const lastSyncedAt = body.lastSyncedAt === undefined
      ? provider.lastSyncedAt
      : body.lastSyncedAt === null
        ? null
        : typeof body.lastSyncedAt === 'string' && !Number.isNaN(new Date(body.lastSyncedAt).getTime())
          ? new Date(body.lastSyncedAt)
          : null;

    const providerType = isRegisteredProviderType(provider.providerType) ? provider.providerType : null;
    if (!providerType) return badRequest('지원하지 않는 provider 유형입니다.');
    const nextStatus = requestedStatus === 'paused' || requestedStatus === 'error'
      ? requestedStatus
      : providerStatus(providerType, connectionMode);
    const configured = providerApiConfigured(providerType);
    const nextErrorCode = body.lastErrorCode === null
      ? null
      : typeof body.lastErrorCode === 'string'
        ? redactSecretText(body.lastErrorCode.trim()).slice(0, 100) || null
        : connectionMode === 'official_api' && !configured
          ? isPublicProviderType(providerType) ? 'CONFIGURATION_REQUIRED' : 'OFFICIAL_API_NOT_CONFIGURED'
          : provider.lastErrorCode;

    const [updated] = await db
      .update(contextProviders)
      .set({
        displayName,
        status: nextStatus,
        externalAccountHash,
        settings: {
          connectionMode,
          consentScope,
          consentGranted: body.consentGranted === undefined
            ? previousSettings.consentGranted === true || typeof previousSettings.consentGrantedAt === 'string'
            : body.consentGranted === true,
          consentGrantedAt: previousSettings.consentGrantedAt ?? now.toISOString(),
          importFormats: ['json', 'markdown', 'text'],
          officialApiConfigured: configured,
        },
        lastSyncedAt,
        lastErrorCode: nextErrorCode,
        updatedAt: now,
      })
      .where(and(eq(contextProviders.id, id), eq(contextProviders.userId, session.userId)))
      .returning();

    if (!updated) return notFound('provider를 찾을 수 없거나 권한이 없습니다.');
    return NextResponse.json(serializeContextProvider(updated));
  } catch (err: unknown) {
    if (err instanceof ContextPayloadTooLargeError) return payloadTooLarge(err.message);
    return internalError(err, 'context provider를 수정하지 못했습니다.');
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
    if (!id) return badRequest('provider ID가 필요합니다.');

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    const deleted = await db
      .delete(contextProviders)
      .where(and(eq(contextProviders.id, id), eq(contextProviders.userId, session.userId)))
      .returning({ id: contextProviders.id });
    if (deleted.length === 0) return notFound('provider를 찾을 수 없거나 권한이 없습니다.');
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    return internalError(err, 'context provider를 삭제하지 못했습니다.');
  }
}
