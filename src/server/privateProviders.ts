import { normalizeContent, type ParsedContextItem } from './contexts';

export const PRIVATE_PROVIDER_TYPES = ['notion', 'github'] as const;
export type PrivateProviderType = (typeof PRIVATE_PROVIDER_TYPES)[number];

export const PRIVATE_PROVIDER_TIMEOUT_MS = 10_000;
export const PRIVATE_PROVIDER_MAX_RESPONSE_BYTES = 1 * 1024 * 1024;
export const PRIVATE_PROVIDER_PAGE_SIZE = 20;

export interface PrivateProviderFetchOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxResponseBytes?: number;
  now?: Date;
}

export class PrivateProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus = 502,
  ) {
    super(message);
    this.name = 'PrivateProviderError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function configuredCredential(providerType: PrivateProviderType): string | null {
  const keys = providerType === 'notion'
    ? ['NOTION_API_KEY', 'NOTION_TOKEN']
    : ['GITHUB_TOKEN', 'GITHUB_API_KEY'];
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

export function isPrivateProviderType(value: unknown): value is PrivateProviderType {
  return typeof value === 'string' && PRIVATE_PROVIDER_TYPES.includes(value as PrivateProviderType);
}

export function privateApiConfigured(providerType: PrivateProviderType): boolean {
  return configuredCredential(providerType) !== null;
}

async function readLimitedResponse(response: Response, maxBytes: number): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new PrivateProviderError('private provider 응답 크기가 제한을 초과했습니다.', 'RESPONSE_TOO_LARGE', 502);
  }

  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    throw new PrivateProviderError('private provider 응답 크기가 제한을 초과했습니다.', 'RESPONSE_TOO_LARGE', 502);
  }
  return body;
}

async function readJson(response: Response, maxBytes: number): Promise<unknown> {
  const body = await readLimitedResponse(response, maxBytes);
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new PrivateProviderError('private provider 응답 형식이 올바르지 않습니다.', 'INVALID_RESPONSE', 502);
  }
}

function textValue(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const result = String(value).replace(/\s+/g, ' ').trim();
    return result ? result.slice(0, 2_000) : null;
  }
  return null;
}

function notionTitle(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const properties = isRecord(value.properties) ? value.properties : {};
  for (const property of Object.values(properties)) {
    if (!isRecord(property)) continue;
    const title = Array.isArray(property.title) ? property.title : [];
    const plain = title
      .map((entry) => isRecord(entry) ? textValue(entry.plain_text ?? entry.content) : null)
      .filter((entry): entry is string => Boolean(entry))
      .join(' ')
      .trim();
    if (plain) return plain.slice(0, 255);
  }
  return textValue(value.url) || null;
}

function notionItems(payload: unknown, fetchedAt: string): ParsedContextItem[] {
  if (!isRecord(payload) || !Array.isArray(payload.results)) return [];
  return payload.results
    .filter(isRecord)
    .slice(0, PRIVATE_PROVIDER_PAGE_SIZE)
    .map((page) => {
      const title = notionTitle(page) || 'Notion page';
      const url = textValue(page.url) || textValue(page.id) || null;
      const editedAt = textValue(page.last_edited_time) || fetchedAt;
      return {
        itemType: 'notion_page',
        title,
        content: normalizeContent([
          title,
          url ? `Notion URL: ${url}` : '',
          `Last edited: ${editedAt}`,
        ].filter(Boolean).join('\n')),
        sourceReference: url,
        occurredAt: editedAt,
        metadata: { provider: 'notion', source: 'official_api' },
      };
    });
}

function githubItems(payload: unknown): ParsedContextItem[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter(isRecord)
    .slice(0, PRIVATE_PROVIDER_PAGE_SIZE)
    .map((repository) => {
      const name = textValue(repository.full_name ?? repository.name) || 'GitHub repository';
      const description = textValue(repository.description) || '설명이 없는 저장소입니다.';
      const language = textValue(repository.language) || '언어 정보 없음';
      const url = textValue(repository.html_url) || null;
      const updatedAt = textValue(repository.updated_at);
      const topics = Array.isArray(repository.topics)
        ? repository.topics.map(textValue).filter((item): item is string => Boolean(item)).slice(0, 10)
        : [];
      return {
        itemType: 'github_repository',
        title: name.slice(0, 255),
        content: normalizeContent([
          name,
          description,
          `Language: ${language}`,
          topics.length > 0 ? `Topics: ${topics.join(', ')}` : '',
        ].filter(Boolean).join('\n')),
        sourceReference: url,
        occurredAt: updatedAt,
        metadata: { provider: 'github', source: 'official_api', topics },
      };
    });
}

export async function fetchPrivateProvider(
  providerType: PrivateProviderType,
  options: PrivateProviderFetchOptions = {},
): Promise<{ providerType: PrivateProviderType; items: ParsedContextItem[]; fetchedAt: string }> {
  if (!isPrivateProviderType(providerType)) {
    throw new PrivateProviderError('지원하지 않는 private provider입니다.', 'UNSUPPORTED_PROVIDER', 400);
  }

  const token = configuredCredential(providerType);
  if (!token) {
    throw new PrivateProviderError('private provider 인증키 설정이 필요합니다.', 'CONFIGURATION_REQUIRED', 503);
  }

  const fetchedAt = (options.now || new Date()).toISOString();
  const timeoutMs = options.timeoutMs ?? PRIVATE_PROVIDER_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? PRIVATE_PROVIDER_MAX_RESPONSE_BYTES;
  const fetchImpl = options.fetchImpl || fetch;
  const isNotion = providerType === 'notion';
  const url = isNotion ? 'https://api.notion.com/v1/search' : 'https://api.github.com/user/repos?per_page=20&sort=updated&direction=desc';
  const init: RequestInit = isNotion
    ? {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({ page_size: PRIVATE_PROVIDER_PAGE_SIZE, sort: { direction: 'descending', timestamp: 'last_edited_time' } }),
    }
    : {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response.ok) {
      throw new PrivateProviderError('private provider API 요청이 실패했습니다.', `UPSTREAM_HTTP_${response.status}`, 502);
    }
    const payload = await readJson(response, maxResponseBytes);
    return {
      providerType,
      items: isNotion ? notionItems(payload, fetchedAt) : githubItems(payload),
      fetchedAt,
    };
  } catch (error: unknown) {
    if (error instanceof PrivateProviderError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new PrivateProviderError('private provider API 요청 시간이 초과되었습니다.', 'SYNC_TIMEOUT', 504);
    }
    throw new PrivateProviderError('private provider API에 연결하지 못했습니다.', 'NETWORK_ERROR', 502);
  }
}
