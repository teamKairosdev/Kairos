import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

export const CONTEXT_PROVIDER_TYPES = [
  'notion',
  'github',
  'worknet',
  'dart',
  'employment24',
] as const;

export type ContextProviderType = (typeof CONTEXT_PROVIDER_TYPES)[number];
export type ContextImportFormat = 'json' | 'markdown' | 'text';
export type ContextConnectionMode = 'official_api' | 'file_import';
export type ContextProviderStatus = 'not_connected' | 'ready' | 'import_only' | 'paused' | 'error';
export type MemoryExportFormat = 'json' | 'markdown';

export const CONTEXT_PROVIDER_STATUSES = [
  'not_connected',
  'ready',
  'import_only',
  'paused',
  'error',
] as const satisfies readonly ContextProviderStatus[];

export const MAX_CONTEXT_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_CONTEXT_REQUEST_BYTES = 6 * 1024 * 1024;
export const MAX_CONTEXT_PROVIDER_REQUEST_BYTES = 64 * 1024;
export const MAX_MEMORY_EXPORT_REQUEST_BYTES = 128 * 1024;
export const MAX_CONTEXT_ITEMS_PER_IMPORT = 500;
export const MAX_CONTEXT_CONTENT_LENGTH = 5 * 1024 * 1024;
export const MAX_CONTEXT_SEARCH_LENGTH = 200;

export class ContextPayloadTooLargeError extends Error {
  constructor(message = '요청 크기가 허용된 크기를 초과했습니다.') {
    super(message);
    this.name = 'ContextPayloadTooLargeError';
  }
}

export class ContextImportError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 413 = 400,
  ) {
    super(message);
    this.name = 'ContextImportError';
  }
}

export interface ContextProviderDefinition {
  type: ContextProviderType;
  label: string;
  officialApi: string;
  envKeys: readonly string[];
  description: string;
}

export const CONTEXT_PROVIDER_DEFINITIONS: readonly ContextProviderDefinition[] = [
  {
    type: 'notion',
    label: 'Notion',
    officialApi: 'Notion API',
    envKeys: ['NOTION_API_KEY'],
    description: 'Notion 공식 API 또는 사용자가 내보낸 파일을 사용합니다.',
  },
  {
    type: 'github',
    label: 'GitHub',
    officialApi: 'GitHub REST API',
    envKeys: ['GITHUB_TOKEN', 'GITHUB_API_KEY'],
    description: 'GitHub 공식 API 또는 사용자가 내보낸 파일을 사용합니다.',
  },
  {
    type: 'worknet',
    label: '워크넷',
    officialApi: '워크넷 Open API',
    envKeys: ['WORKNET_API_KEY', 'WORKNET_OPEN_API_KEY'],
    description: '워크넷 공식 API 또는 사용자가 내보낸 파일을 사용합니다.',
  },
  {
    type: 'dart',
    label: 'DART',
    officialApi: 'OpenDART API',
    envKeys: ['OPENDART_API_KEY', 'DART_API_KEY'],
    description: 'OpenDART 공식 API 또는 사용자가 내보낸 파일을 사용합니다.',
  },
  {
    type: 'employment24',
    label: '고용24',
    officialApi: '고용24 Open API',
    envKeys: ['EMPLOYMENT24_API_KEY', 'EMP24_API_KEY', 'WORK24_API_KEY'],
    description: '고용24 공식 API 또는 사용자가 내보낸 파일을 사용합니다.',
  },
];

export interface ParsedContextItem {
  itemType: string;
  title: string | null;
  content: string;
  sourceReference: string | null;
  occurredAt: string | null;
  metadata: Record<string, unknown>;
}

export interface ContextExportItem {
  id: string;
  providerType: string;
  providerDisplayName: string | null;
  itemType: string;
  title: string | null;
  content: string;
  contentHash: string;
  sourceReferenceHash: string | null;
  metadata: Record<string, unknown>;
  occurredAt: Date | string | null;
  importedAt: Date | string | null;
  updatedAt: Date | string | null;
}

export function getProviderDefinition(providerType: string): ContextProviderDefinition | null {
  return CONTEXT_PROVIDER_DEFINITIONS.find((definition) => definition.type === providerType) ?? null;
}

export function isContextProviderType(value: unknown): value is ContextProviderType {
  return typeof value === 'string' && CONTEXT_PROVIDER_TYPES.includes(value as ContextProviderType);
}

export function isContextImportFormat(value: unknown): value is ContextImportFormat {
  return value === 'json' || value === 'markdown' || value === 'text';
}

export function isContextConnectionMode(value: unknown): value is ContextConnectionMode {
  return value === 'official_api' || value === 'file_import';
}

export function isMemoryExportFormat(value: unknown): value is MemoryExportFormat {
  return value === 'json' || value === 'markdown';
}

export function isContextProviderStatus(value: unknown): value is ContextProviderStatus {
  return (
    value === 'not_connected' ||
    value === 'ready' ||
    value === 'import_only' ||
    value === 'paused' ||
    value === 'error'
  );
}

export function officialApiConfigured(providerType: ContextProviderType): boolean {
  const definition = getProviderDefinition(providerType);
  return Boolean(definition?.envKeys.some((key) => Boolean(process.env[key]?.trim())));
}

export function deriveProviderStatus(
  providerType: ContextProviderType,
  connectionMode: ContextConnectionMode,
  currentStatus?: string | null,
): ContextProviderStatus {
  if (currentStatus === 'paused') return 'paused';
  if (currentStatus === 'error') return 'error';
  if (connectionMode === 'file_import') return 'import_only';
  return officialApiConfigured(providerType) ? 'ready' : 'not_connected';
}

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function requestContentLength(request: Request): number | null {
  const value = request.headers.get('content-length');
  if (!value) return null;
  const length = Number(value);
  return Number.isFinite(length) && length >= 0 ? length : null;
}

export function requestExceedsLimit(request: Request, limitBytes: number): boolean {
  const length = requestContentLength(request);
  return length !== null && length > limitBytes;
}

export async function readLimitedJsonBody(
  request: Request,
  limitBytes = MAX_CONTEXT_REQUEST_BYTES,
): Promise<unknown | null> {
  if (requestExceedsLimit(request, limitBytes)) {
    throw new ContextPayloadTooLargeError();
  }

  const rawBody = await request.text();
  if (utf8ByteLength(rawBody) > limitBytes) {
    throw new ContextPayloadTooLargeError();
  }
  if (!rawBody.trim()) return null;

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return null;
  }
}

export function normalizeContent(content: string): string {
  return content.replace(/\r\n?/g, '\n').trim();
}

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function contentHash(content: string): string {
  return sha256(normalizeContent(content));
}

export function sourceReferenceHash(sourceReference: string): string {
  return sha256(sourceReference.trim());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function safeItemType(value: unknown, fallback: string): string {
  const candidate = stringValue(value)?.replace(/[\r\n]/g, ' ').slice(0, 50);
  return candidate || fallback;
}

function safeOccurredAt(value: unknown): string | null {
  const candidate = stringValue(value);
  if (!candidate) return null;
  const timestamp = new Date(candidate);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

function stableJson(value: unknown): string {
  const serialized = JSON.stringify(value, null, 2);
  return serialized === undefined ? String(value) : serialized;
}

function parseJsonItem(value: unknown, index: number): ParsedContextItem {
  const fallbackTitle = `JSON 항목 ${index + 1}`;
  if (!isRecord(value)) {
    const content = stableJson(value);
    return {
      itemType: 'json',
      title: fallbackTitle,
      content,
      sourceReference: null,
      occurredAt: null,
      metadata: {},
    };
  }

  const explicitContent = value.content ?? value.text ?? value.body;
  const content = typeof explicitContent === 'string' ? explicitContent : stableJson(value);
  const metadata = isRecord(value.metadata) ? value.metadata : {};

  return {
    itemType: safeItemType(value.itemType ?? value.type, 'json'),
    title: stringValue(value.title ?? value.name) || fallbackTitle,
    content,
    sourceReference: stringValue(value.sourceReference ?? value.sourceUrl ?? value.url ?? value.id),
    occurredAt: safeOccurredAt(value.occurredAt ?? value.createdAt ?? value.date),
    metadata,
  };
}

export function parseContextImport(
  rawText: string,
  format: ContextImportFormat,
  fallbackTitle?: string | null,
): ParsedContextItem[] {
  const text = normalizeContent(rawText);
  if (!text) throw new ContextImportError('가져올 context 내용이 비어 있습니다.');
  if (utf8ByteLength(text) > MAX_CONTEXT_CONTENT_LENGTH) {
    throw new ContextImportError('context 내용이 허용된 크기를 초과했습니다.', 413);
  }

  if (format === 'json') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      throw new ContextImportError('JSON 형식이 올바르지 않습니다.');
    }

    const values = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.items)
        ? parsed.items
        : [parsed];

    if (values.length > MAX_CONTEXT_ITEMS_PER_IMPORT) {
      throw new ContextImportError(`한 번에 ${MAX_CONTEXT_ITEMS_PER_IMPORT}개 이하의 항목만 가져올 수 있습니다.`);
    }

    return values.map((value, index) => {
      const item = parseJsonItem(value, index);
      if (index === 0 && fallbackTitle && item.title === 'JSON 항목 1') item.title = fallbackTitle;
      return item;
    });
  }

  const heading = text.match(/^#{1,6}\s+(.+)$/m)?.[1]?.trim() || null;
  return [
    {
      itemType: format,
      title: stringValue(fallbackTitle) || heading,
      content: text,
      sourceReference: null,
      occurredAt: null,
      metadata: {},
    },
  ];
}

export function formatFromFileName(fileName: string): ContextImportFormat | null {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'json') return 'json';
  if (extension === 'md' || extension === 'markdown') return 'markdown';
  if (extension === 'txt') return 'text';
  return null;
}

export function redactSecretText(value: string): string {
  return value
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi, '[REDACTED PRIVATE KEY]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [REDACTED]')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{10,}|github_pat_[A-Za-z0-9_]{10,}|secret_[A-Za-z0-9]{10,}|sk-[A-Za-z0-9]{10,})\b/g, '[REDACTED]')
    .replace(/([?&](?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|secret|token)=)[^&#\s]*/gi, '$1[REDACTED]')
    .replace(
      /((?:["']?\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password\w*|passwd\w*|secret\w*|authorization\w*|private[_-]?key\w*|credential\w*|token\w*)\b["']?\s*[:=]\s*)(["']))[^"']*\2/gi,
      '$1[REDACTED]$2',
    )
    .replace(
      /(["']?\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password\w*|passwd\w*|secret\w*|authorization\w*|private[_-]?key\w*|credential\w*|token\w*)\b["']?\s*[:=]\s*["']?)([^"'\s,}\]]+)/gi,
      '$1[REDACTED]',
    )
    .replace(/^(\s*(?:token|key|secret|password)\s+)\S+$/gim, '$1[REDACTED]');
}

function isSecretKey(key: string): boolean {
  const normalized = key.replace(/[^a-zA-Z]/g, '').toLowerCase();
  return (
    normalized.includes('apikey') ||
    normalized.includes('accesstoken') ||
    normalized.includes('refreshtoken') ||
    normalized.includes('clientsecret') ||
    normalized.includes('password') ||
    normalized.includes('passwd') ||
    normalized.includes('secret') ||
    normalized.includes('authorization') ||
    normalized.includes('privatekey') ||
    normalized.includes('credential') ||
    normalized.includes('cookie') ||
    normalized.includes('sessiontoken') ||
    normalized.endsWith('token')
  );
}

export function sanitizeForExport(value: unknown): unknown {
  if (typeof value === 'string') return redactSecretText(value);
  if (Array.isArray(value)) return value.map((entry) => sanitizeForExport(entry));
  if (isRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (isSecretKey(key)) continue;
      result[key] = sanitizeForExport(entry);
    }
    return result;
  }
  return value;
}

export function sanitizeForStorage(value: unknown): unknown {
  return sanitizeForExport(value);
}

export function sanitizeContextItemForStorage(item: ParsedContextItem): ParsedContextItem {
  return {
    itemType: redactSecretText(item.itemType).replace(/[\r\n]/g, ' ').slice(0, 50) || 'text',
    title: item.title ? redactSecretText(item.title).replace(/[\r\n]/g, ' ').slice(0, 255) : null,
    content: redactSecretText(normalizeContent(item.content)),
    sourceReference: item.sourceReference ? redactSecretText(item.sourceReference).slice(0, 1000) : null,
    occurredAt: item.occurredAt,
    metadata: (sanitizeForStorage(item.metadata) || {}) as Record<string, unknown>,
  };
}

function isoDate(value: Date | string | null): string | null {
  if (!value) return null;
  const timestamp = value instanceof Date ? value : new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

function exportItem(item: ContextExportItem): Record<string, unknown> {
  return {
    id: item.id,
    provider: {
      type: item.providerType,
      displayName: item.providerDisplayName ? redactSecretText(item.providerDisplayName) : null,
    },
    itemType: redactSecretText(item.itemType),
    title: item.title ? redactSecretText(item.title) : null,
    content: redactSecretText(item.content),
    contentHash: item.contentHash,
    sourceReferenceHash: item.sourceReferenceHash,
    metadata: sanitizeForExport(item.metadata),
    occurredAt: isoDate(item.occurredAt),
    importedAt: isoDate(item.importedAt),
    updatedAt: isoDate(item.updatedAt),
  };
}

export function renderContextExport(
  format: MemoryExportFormat,
  items: readonly ContextExportItem[],
  exportedAt = new Date(),
): string {
  const exportedAtIso = exportedAt.toISOString();
  const exportedItems = items.map(exportItem);
  const scope = '인증된 사용자가 소유하고 선택한 context item만 포함합니다. 비밀값은 제거됩니다.';

  if (format === 'json') {
    return `${JSON.stringify(
      {
        formatVersion: 1,
        exportedAt: exportedAtIso,
        ownership: 'authenticated-user-owned-context-only',
        consentScope: 'user-selected-context-items',
        redaction: 'secrets-redacted',
        scope,
        itemCount: exportedItems.length,
        items: exportedItems,
      },
      null,
      2,
    )}\n`;
  }

  const sections = exportedItems.map((item) => {
    const provider = item.provider as { type: string; displayName: string | null };
    const metadata = JSON.stringify(item.metadata, null, 2);
    return [
      `## ${String(item.title || item.itemType || 'Context item').replace(/[\r\n]/g, ' ')}`,
      '',
      `- Provider: ${redactSecretText(provider.displayName || provider.type).replace(/[\r\n]/g, ' ')}`,
      `- Type: ${item.itemType}`,
      `- Content hash: ${item.contentHash}`,
      `- Source reference hash: ${item.sourceReferenceHash || 'none'}`,
      `- Occurred at: ${String(item.occurredAt || 'none')}`,
      '',
      '### Content',
      '',
      String(item.content),
      '',
      '### Metadata',
      '',
      '```json',
      metadata,
      '```',
    ].join('\n');
  });

  return [
    '# Kairos Context Export',
    '',
    `- Exported at: ${exportedAtIso}`,
    '- Ownership: authenticated user-owned context only',
    '- Consent scope: user-selected context items',
    '- Redaction: secrets removed',
    `- Scope: ${scope}`,
    `- Item count: ${exportedItems.length}`,
    '',
    ...sections,
    '',
  ].join('\n');
}

const EXPORT_DIR = join(tmpdir(), 'kairos-memory-exports');

function safeOutputRef(outputRef: string): string | null {
  const candidate = basename(outputRef);
  if (!candidate || candidate !== outputRef || !/^[0-9a-f-]+\.(?:json|markdown)$/.test(candidate)) return null;
  return candidate;
}

export function writeMemoryExport(outputRef: string, content: string): void {
  const safeRef = safeOutputRef(outputRef);
  if (!safeRef) throw new Error('export output reference is invalid');
  if (!existsSync(EXPORT_DIR)) mkdirSync(EXPORT_DIR, { recursive: true });
  writeFileSync(join(EXPORT_DIR, safeRef), content, { encoding: 'utf8', mode: 0o600 });
}

export function readMemoryExport(outputRef: string): string | null {
  const safeRef = safeOutputRef(outputRef);
  if (!safeRef) return null;
  const filePath = join(EXPORT_DIR, safeRef);
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf8');
}

export function deleteMemoryExport(outputRef: string): void {
  const safeRef = safeOutputRef(outputRef);
  if (!safeRef) return;
  const filePath = join(EXPORT_DIR, safeRef);
  if (existsSync(filePath)) unlinkSync(filePath);
}
