import {
  normalizeContent,
  type ContextConnectionMode,
  type ContextProviderStatus,
  type ParsedContextItem,
} from './contexts';

export const PUBLIC_PROVIDER_TYPES = ['worknet', 'employment24', 'qnet', 'dart'] as const;
export type PublicProviderType = (typeof PUBLIC_PROVIDER_TYPES)[number];

export const PUBLIC_PROVIDER_TIMEOUT_MS = 10_000;
export const PUBLIC_PROVIDER_MAX_RESPONSE_BYTES = 1 * 1024 * 1024;
export const PUBLIC_PROVIDER_PAGE_SIZE = 20;

export interface PublicProviderDefinition {
  type: PublicProviderType;
  label: string;
  officialApi: string;
  envKeys: readonly string[];
  endpoint: string;
}

export const PUBLIC_PROVIDER_DEFINITIONS: readonly PublicProviderDefinition[] = [
  {
    type: 'worknet',
    label: '워크넷',
    officialApi: '워크넷 채용정보 Open API',
    envKeys: ['WORKNET_API_KEY', 'WORKNET_OPEN_API_KEY'],
    endpoint: 'https://openapi.work.go.kr/opi/opi/opia/wantedApi.do',
  },
  {
    type: 'employment24',
    label: '고용24',
    officialApi: '고용24 Open API',
    envKeys: ['EMPLOYMENT24_API_KEY', 'EMP24_API_KEY', 'WORK24_API_KEY'],
    endpoint: 'https://openapi.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do',
  },
  {
    type: 'qnet',
    label: '큐넷',
    officialApi: '한국산업인력공단 큐넷 Open API',
    envKeys: ['QNET_API_KEY', 'QNET_SERVICE_KEY'],
    endpoint: 'https://openapi.q-net.or.kr/api/service/rest/InquiryCfmnPolicySVC/getList',
  },
  {
    type: 'dart',
    label: 'DART',
    officialApi: 'OpenDART API',
    envKeys: ['DART_API_KEY', 'OPENDART_API_KEY'],
    endpoint: 'https://opendart.fss.or.kr/api/list.json',
  },
];

export interface PublicProviderFetchOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxResponseBytes?: number;
  now?: Date;
}

export interface PublicProviderFetchResult {
  providerType: PublicProviderType;
  items: ParsedContextItem[];
  fetchedAt: string;
}

export class PublicProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus = 502,
  ) {
    super(message);
    this.name = 'PublicProviderError';
  }
}

export function isPublicProviderType(value: unknown): value is PublicProviderType {
  return typeof value === 'string' && PUBLIC_PROVIDER_TYPES.includes(value as PublicProviderType);
}

export function getPublicProviderDefinition(value: string): PublicProviderDefinition | null {
  return PUBLIC_PROVIDER_DEFINITIONS.find((definition) => definition.type === value) ?? null;
}

function configuredCredential(providerType: PublicProviderType): { key: string; envKey: string } | null {
  const definition = getPublicProviderDefinition(providerType);
  if (!definition) return null;

  for (const envKey of definition.envKeys) {
    const key = process.env[envKey]?.trim();
    if (key) return { key, envKey };
  }
  return null;
}

export function publicApiConfigured(providerType: PublicProviderType): boolean {
  return configuredCredential(providerType) !== null;
}

export function derivePublicProviderStatus(
  providerType: PublicProviderType,
  connectionMode: ContextConnectionMode,
  currentStatus?: string | null,
): ContextProviderStatus {
  if (currentStatus === 'paused') return 'paused';
  if (currentStatus === 'error') return 'error';
  if (connectionMode === 'file_import') return 'import_only';
  return publicApiConfigured(providerType) ? 'ready' : 'not_connected';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizedKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function cleanText(value: unknown, maxLength = 2_000): string | null {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return null;
  const text = String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.slice(0, maxLength) : null;
}

function field(record: Record<string, unknown>, names: readonly string[]): string | null {
  const entries = Object.entries(record);
  for (const name of names) {
    const target = normalizedKey(name);
    const entry = entries.find(([key]) => normalizedKey(key) === target);
    const value = entry ? cleanText(entry[1]) : null;
    if (value) return value;
  }
  return null;
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function xmlText(value: string): string | null {
  const decoded = decodeXml(value).replace(/<[^>]*>/g, ' ');
  return cleanText(decoded);
}

function parseXmlRecord(value: string): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  const fieldPattern = /<([a-zA-Z][\w:.-]*)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = fieldPattern.exec(value))) {
    const key = match[1].split(':').pop() || match[1];
    const text = xmlText(match[2]);
    if (text) record[key] = text;
  }
  return record;
}

function parseXmlRecords(value: string): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  const recordNames = ['item', 'wanted', 'wantedInfo', 'job', 'jobInfo', 'training', 'course', 'data', 'row'];

  for (const recordName of recordNames) {
    const pattern = new RegExp(`<${recordName}\\b[^>]*>([\\s\\S]*?)<\\/${recordName}>`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(value))) {
      const record = parseXmlRecord(match[1]);
      if (Object.keys(record).length > 0) records.push(record);
    }
    if (records.length > 0) return records;
  }

  const rootRecord = parseXmlRecord(value);
  const recordKeys = new Set([
    'title',
    'wantedtitle',
    'jobtitle',
    'reportnm',
    'reportname',
    'company',
    'companyname',
    'corpname',
    'wantedauthno',
    'rceptno',
    'trprid',
    'cfmncd',
    'courseName',
  ].map(normalizedKey));
  return Object.keys(rootRecord).some((key) => recordKeys.has(normalizedKey(key))) ? [rootRecord] : [];
}

function collectJsonRecords(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 6 || value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => (isRecord(entry) ? [entry] : collectJsonRecords(entry, depth + 1)));
  }
  if (!isRecord(value)) return [];

  const preferredKeys = [
    'list',
    'items',
    'item',
    'wanted',
    'wantedList',
    'job',
    'jobList',
    'training',
    'course',
    'data',
    'result',
    'results',
  ];
  let foundPreferredKey = false;
  for (const key of preferredKeys) {
    if (key in value) {
      foundPreferredKey = true;
      const records = collectJsonRecords(value[key], depth + 1);
      if (records.length > 0) return records;
    }
  }

  if (foundPreferredKey) return [];

  for (const entry of Object.values(value)) {
    const records = collectJsonRecords(entry, depth + 1);
    if (records.length > 0) return records;
  }

  const ignoredKeys = new Set(['status', 'message', 'messageCd', 'resultCode'].map(normalizedKey));
  const meaningfulKeys = Object.keys(value).filter((key) => !ignoredKeys.has(normalizedKey(key)));
  return meaningfulKeys.length > 0 ? [value] : [];
}

interface ParsedPayload {
  format: 'json' | 'xml';
  value: unknown;
  records: Record<string, unknown>[];
}

function parseResponseBody(body: string): ParsedPayload {
  const trimmed = body.trim();
  if (!trimmed) throw new PublicProviderError('공공 API 응답이 비어 있습니다.', 'INVALID_RESPONSE');

  try {
    const value = JSON.parse(trimmed) as unknown;
    return { format: 'json', value, records: collectJsonRecords(value) };
  } catch {
    if (!trimmed.startsWith('<')) {
      throw new PublicProviderError('공공 API 응답 형식을 해석할 수 없습니다.', 'INVALID_RESPONSE');
    }
    const records = parseXmlRecords(trimmed);
    if (records.length === 0 && !/<(?:messageCd|resultCode|returnReasonCode|status)\b/i.test(trimmed)) {
      throw new PublicProviderError('공공 API 응답 형식을 해석할 수 없습니다.', 'INVALID_RESPONSE');
    }
    return { format: 'xml', value: trimmed, records };
  }
}

function scalarFromJson(value: unknown): string | null {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : null;
}

function responseCode(payload: ParsedPayload): string | null {
  if (payload.format === 'json' && isRecord(payload.value)) {
    const candidates = ['status', 'resultCode', 'messageCd', 'returnReasonCode', 'code'];
    for (const name of candidates) {
      const value = Object.entries(payload.value).find(([key]) => normalizedKey(key) === normalizedKey(name));
      const code = value ? scalarFromJson(value[1])?.trim() : null;
      if (code) return code;
    }
    return null;
  }

  const root = String(payload.value);
  for (const name of ['resultCode', 'messageCd', 'returnReasonCode', 'status', 'code']) {
    const pattern = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i');
    const match = root.match(pattern);
    const code = match ? xmlText(match[1]) : null;
    if (code) return code;
  }
  return null;
}

function isSuccessfulResponse(providerType: PublicProviderType, code: string): boolean {
  if (providerType === 'dart') return code === '000' || code === '0';
  if (providerType === 'qnet') return code === '00' || code === '000';
  return code === '00' || code === '000' || code === '0';
}

function throwForProviderError(providerType: PublicProviderType, payload: ParsedPayload): void {
  const code = responseCode(payload);
  if (!code || isSuccessfulResponse(providerType, code)) return;
  const safeCode = code.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'UNKNOWN';
  throw new PublicProviderError('공공 API가 오류 코드를 반환했습니다.', `UPSTREAM_${safeCode}`);
}

function formatDateForDart(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function requestUrl(providerType: PublicProviderType, key: string, now: Date): string {
  const definition = getPublicProviderDefinition(providerType);
  if (!definition) throw new PublicProviderError('지원하지 않는 공공 provider입니다.', 'UNSUPPORTED_PROVIDER', 400);
  const url = new URL(definition.endpoint);
  const params: Record<string, string> = {};

  if (providerType === 'worknet') {
    Object.assign(params, {
      authKey: key,
      callTp: 'L',
      returnType: 'xml',
      startPage: '1',
      display: String(PUBLIC_PROVIDER_PAGE_SIZE),
    });
  } else if (providerType === 'employment24') {
    Object.assign(params, {
      authKey: key,
      returnType: 'XML',
      outType: '1',
      pageNum: '1',
      pageSize: String(PUBLIC_PROVIDER_PAGE_SIZE),
    });
  } else if (providerType === 'qnet') {
    Object.assign(params, {
      ServiceKey: key,
      numOfRows: String(PUBLIC_PROVIDER_PAGE_SIZE),
      pageNo: '1',
    });
  } else {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 7);
    Object.assign(params, {
      crtfc_key: key,
      bgn_de: formatDateForDart(start),
      end_de: formatDateForDart(now),
      page_no: '1',
      page_count: String(PUBLIC_PROVIDER_PAGE_SIZE),
    });
  }

  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return url.toString();
}

async function readLimitedResponse(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new PublicProviderError('공공 API 응답 크기가 제한을 초과했습니다.', 'RESPONSE_TOO_LARGE', 502);
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      const value = chunk.value instanceof Uint8Array ? chunk.value : new Uint8Array(chunk.value);
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new PublicProviderError('공공 API 응답 크기가 제한을 초과했습니다.', 'RESPONSE_TOO_LARGE', 502);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

function normalizedDate(value: string | null): string | null {
  if (!value) return null;
  const compact = value.replace(/[^0-9]/g, '');
  if (/^\d{8}$/.test(compact)) {
    const date = new Date(`${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (/^\d{14}$/.test(compact)) {
    const date = new Date(
      `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T${compact.slice(8, 10)}:${compact.slice(10, 12)}:${compact.slice(12, 14)}.000Z`,
    );
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sourceReference(providerType: PublicProviderType, record: Record<string, unknown>): string | null {
  const direct = field(record, [
    'sourceReference',
    'sourceUrl',
    'wantedInfoUrl',
    'wantedMobileInfoUrl',
    'jobUrl',
    'url',
    'link',
    'rceptNo',
    'receiptNo',
    'wantedAuthNo',
    'trprId',
    'cfmnCd',
    'seq',
    'id',
  ]);
  if (!direct) return null;
  if (/^https?:\/\//i.test(direct)) return direct.slice(0, 1_000);
  if (providerType === 'dart' && /^\d{10,}$/.test(direct)) {
    return `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${direct}`;
  }
  return `${providerType}:${direct}`.slice(0, 1_000);
}

const CONTENT_FIELDS: readonly [string, readonly string[]][] = [
  ['회사', ['company', 'companyName', 'corpName', 'corp_name', 'instNm', 'institutionName']],
  ['공고', ['title', 'wantedTitle', 'jobTitle', 'reportNm', 'report_nm', 'subject']],
  ['지역', ['region', 'workRegion', 'workAddr', 'area', 'location']],
  ['고용형태', ['employmentType', 'empTpNm', 'hireType', 'employment']],
  ['급여', ['salary', 'sal', 'salTpNm', 'pay']],
  ['훈련과정', ['courseName', 'trainingName', 'trprNm', 'courseTitle']],
  ['자격', ['cfmnNm', 'qualificationName', 'seriesNm', 'grade']],
  ['접수일', ['receiptDate', 'rceptDt', 'rcept_dt', 'regDt', 'reg_dt', 'createdAt']],
  ['마감일', ['closeDt', 'closeDate', 'endDate']],
  ['수정일', ['modifyDt', 'modifiedAt', 'updatedAt']],
  ['접수기관', ['filer', 'flrNm', 'organization', 'provider']],
];

function normalizedItem(providerType: PublicProviderType, record: Record<string, unknown>): ParsedContextItem {
  const definition = getPublicProviderDefinition(providerType);
  const company = field(record, ['company', 'companyName', 'corpName', 'corp_name', 'instNm', 'institutionName']);
  const report = field(record, ['reportNm', 'report_nm']);
  const primaryTitle = field(record, [
    'title',
    'wantedTitle',
    'jobTitle',
    'subject',
    'courseName',
    'trainingName',
    'trprNm',
    'cfmnNm',
  ]);
  const title = cleanText(company && report ? `${company} - ${report}` : primaryTitle || report || company) || `${definition?.label || providerType} 공식 정보`;

  const contentLines = CONTENT_FIELDS
    .map(([label, names]) => {
      const value = field(record, names);
      return value ? `${label}: ${value}` : null;
    })
    .filter((value): value is string => Boolean(value));
  const content = normalizeContent([title, ...contentLines].join('\n')).slice(0, 10_000);

  const occurredAt = normalizedDate(field(record, [
    'occurredAt',
    'modifyDt',
    'modifiedAt',
    'updatedAt',
    'rceptDt',
    'rcept_dt',
    'regDt',
    'reg_dt',
    'receiptDate',
    'createdAt',
    'date',
  ]));
  const reference = sourceReference(providerType, record);
  const metadata: Record<string, unknown> = {
    provider: providerType,
    officialApi: definition?.officialApi || providerType,
  };
  for (const [label, names] of CONTENT_FIELDS) {
    const value = field(record, names);
    if (value) metadata[label] = value.slice(0, 500);
  }

  return {
    itemType: providerType,
    title: title.slice(0, 255),
    content,
    sourceReference: reference,
    occurredAt,
    metadata,
  };
}

function deduplicateItems(providerType: PublicProviderType, records: readonly Record<string, unknown>[]): ParsedContextItem[] {
  const seen = new Set<string>();
  const items: ParsedContextItem[] = [];
  for (const record of records) {
    const item = normalizedItem(providerType, record);
    const key = item.sourceReference || `${item.title}:${item.occurredAt || ''}:${item.content}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
    if (items.length >= PUBLIC_PROVIDER_PAGE_SIZE) break;
  }
  return items;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export async function fetchPublicProvider(
  providerType: PublicProviderType,
  options: PublicProviderFetchOptions = {},
): Promise<PublicProviderFetchResult> {
  if (!isPublicProviderType(providerType)) {
    throw new PublicProviderError('지원하지 않는 공공 provider입니다.', 'UNSUPPORTED_PROVIDER', 400);
  }
  const credential = configuredCredential(providerType);
  if (!credential) {
    throw new PublicProviderError('공공 API 인증키 설정이 필요합니다.', 'CONFIGURATION_REQUIRED', 503);
  }

  const now = options.now || new Date();
  const timeoutMs = options.timeoutMs ?? PUBLIC_PROVIDER_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? PUBLIC_PROVIDER_MAX_RESPONSE_BYTES;
  const fetchImpl = options.fetchImpl || fetch;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl(requestUrl(providerType, credential.key, now), {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json, application/xml, text/xml' },
      signal: controller.signal,
    });
    const body = await readLimitedResponse(response, maxResponseBytes);
    if (!response.ok) {
      throw new PublicProviderError('공공 API HTTP 요청이 실패했습니다.', `UPSTREAM_HTTP_${response.status}`);
    }

    const payload = parseResponseBody(body);
    throwForProviderError(providerType, payload);
    return {
      providerType,
      items: deduplicateItems(providerType, payload.records),
      fetchedAt: now.toISOString(),
    };
  } catch (error: unknown) {
    if (error instanceof PublicProviderError) throw error;
    if (timedOut || isAbortError(error)) {
      throw new PublicProviderError('공공 API 요청 시간이 초과되었습니다.', 'SYNC_TIMEOUT', 504);
    }
    throw new PublicProviderError('공공 API에 연결하지 못했습니다.', 'NETWORK_ERROR', 502);
  } finally {
    clearTimeout(timer);
  }
}
