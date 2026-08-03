import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { contextProviders } from '@/db/schema';
import { getSession } from '@/server/getSession';
import {
  CONTEXT_PROVIDER_TYPES,
  ContextPayloadTooLargeError,
  MAX_CONTEXT_PROVIDER_REQUEST_BYTES,
  deriveProviderStatus,
  getProviderDefinition,
  isContextConnectionMode,
  isContextProviderType,
  officialApiConfigured,
  readLimitedJsonBody,
  redactSecretText,
  sha256,
  type ContextConnectionMode,
  type ContextProviderType,
  type ContextProviderStatus,
} from '@/server/contexts';
import {
  derivePublicProviderStatus,
  getPublicProviderDefinition,
  isPublicProviderType,
  publicApiConfigured,
  type PublicProviderType,
} from '@/server/publicProviders';
import { badRequest, internalError, payloadTooLarge, serviceUnavailable, unauthorized } from '@/server/http';

const IMPORT_FORMATS = ['json', 'markdown', 'text'] as const;
const DEFAULT_CONSENT_SCOPE = ['provider metadata', 'user-selected context items', 'user-requested export'];
type RegisteredProviderType = ContextProviderType | PublicProviderType;

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

export function isRegisteredProviderType(value: unknown): value is RegisteredProviderType {
  return isContextProviderType(value) || isPublicProviderType(value);
}

export function providerDefinition(providerType: RegisteredProviderType) {
  return getProviderDefinition(providerType) || getPublicProviderDefinition(providerType);
}

export function providerApiConfigured(providerType: RegisteredProviderType): boolean {
  return isPublicProviderType(providerType) ? publicApiConfigured(providerType) : officialApiConfigured(providerType);
}

export function providerStatus(
  providerType: RegisteredProviderType,
  connectionMode: ContextConnectionMode,
  currentStatus?: string | null,
): ContextProviderStatus {
  return isPublicProviderType(providerType)
    ? derivePublicProviderStatus(providerType, connectionMode, currentStatus)
    : deriveProviderStatus(providerType, connectionMode, currentStatus);
}

function connectionModeFromSettings(settings: Record<string, unknown>): ContextConnectionMode {
  return isContextConnectionMode(settings.connectionMode) ? settings.connectionMode : 'official_api';
}

function serializeProvider(row: typeof contextProviders.$inferSelect) {
  const settings = row.settings as Record<string, unknown>;
  const connectionMode = connectionModeFromSettings(settings);
  const providerType = isRegisteredProviderType(row.providerType) ? row.providerType : null;
  const configured = providerType ? providerApiConfigured(providerType) : false;
  const status = providerType
    ? providerStatus(providerType, connectionMode, row.status)
    : row.status;

  return {
    id: row.id,
    providerType: row.providerType,
    displayName: row.displayName ? redactSecretText(row.displayName) : null,
    connectionMode,
    status,
    connectionState:
      status === 'paused'
        ? 'paused'
        : status === 'error'
          ? 'error'
            : connectionMode === 'file_import'
              ? 'file_import_ready'
            : configured
              ? 'official_api_ready'
              : 'official_api_unconfigured',
    officialApi: providerType ? providerDefinition(providerType)?.officialApi ?? null : null,
    officialApiConfigured: configured,
    consentScope: safeConsentScope(settings.consentScope),
    consentGranted: settings.consentGranted === true || (
      typeof settings.consentGrantedAt === 'string'
      && !Number.isNaN(new Date(settings.consentGrantedAt).getTime())
    ),
    importFormats: [...IMPORT_FORMATS],
    lastSyncedAt: row.lastSyncedAt,
    lastErrorCode: row.lastErrorCode ? redactSecretText(row.lastErrorCode) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function serializeContextProvider(row: typeof contextProviders.$inferSelect) {
  return serializeProvider(row);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    const rows = await db
      .select()
      .from(contextProviders)
      .where(eq(contextProviders.userId, session.userId))
      .orderBy(asc(contextProviders.createdAt));

    return NextResponse.json(rows.map(serializeProvider));
  } catch (err: unknown) {
    if (err instanceof ContextPayloadTooLargeError) return payloadTooLarge(err.message);
    return internalError(err, 'context provider 목록을 불러오지 못했습니다.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const parsedBody = await readLimitedJsonBody(req, MAX_CONTEXT_PROVIDER_REQUEST_BYTES);
    if (!isRecord(parsedBody)) return badRequest('요청 본문이 올바르지 않습니다.');
    const body = parsedBody;

    const providerTypeValue = body.providerType;
    if (!isRegisteredProviderType(providerTypeValue)) {
      return badRequest(`지원하는 provider는 ${[...CONTEXT_PROVIDER_TYPES, 'qnet'].join(', ')}입니다.`);
    }
    const providerType: RegisteredProviderType = providerTypeValue;

    if (hasCredentialInput(body)) {
      return badRequest('API key와 자격 증명 원문은 이 MVP에서 받거나 저장하지 않습니다. 공식 서버 설정 또는 파일 import를 사용하세요.');
    }

    const connectionModeValue = body.connectionMode ?? 'official_api';
    if (!isContextConnectionMode(connectionModeValue)) {
      return badRequest('connectionMode는 official_api 또는 file_import이어야 합니다.');
    }
    const connectionMode: ContextConnectionMode = connectionModeValue;

    const consentScope = safeConsentScope(body.consentScope);

    const displayNameValue = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    const definition = providerDefinition(providerType);
    const displayName = redactSecretText(displayNameValue).slice(0, 160) || definition?.label || providerType;
    if (body.consentGranted !== undefined && body.consentGranted !== true) {
      return badRequest('공식 API 동기화를 위해 provider 사용 동의가 필요합니다.');
    }
    const configured = providerApiConfigured(providerType);
    const status = providerStatus(providerType, connectionMode);
    const now = new Date();
    const externalAccountId = typeof body.externalAccountId === 'string' ? body.externalAccountId.trim() : '';

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    const existing = await db
      .select({ id: contextProviders.id })
      .from(contextProviders)
      .where(and(eq(contextProviders.userId, session.userId), eq(contextProviders.providerType, providerType)))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: '해당 provider가 이미 등록되어 있습니다.' }, { status: 409 });
    }

    const [created] = await db
      .insert(contextProviders)
      .values({
        userId: session.userId,
        providerType,
        displayName,
        status,
        externalAccountHash: externalAccountId ? sha256(externalAccountId) : null,
        credentialRef: null,
        settings: {
          connectionMode,
          consentScope,
          consentGranted: true,
          consentGrantedAt: now.toISOString(),
          importFormats: [...IMPORT_FORMATS],
          officialApiConfigured: configured,
        },
        lastSyncedAt: null,
        lastErrorCode: connectionMode === 'official_api' && !configured
          ? isPublicProviderType(providerType) ? 'CONFIGURATION_REQUIRED' : 'OFFICIAL_API_NOT_CONFIGURED'
          : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(serializeProvider(created), { status: 201 });
  } catch (err: unknown) {
    if (err instanceof ContextPayloadTooLargeError) return payloadTooLarge(err.message);
    return internalError(err, 'context provider를 등록하지 못했습니다.');
  }
}
