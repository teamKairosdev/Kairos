import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import {
  ContextImportError,
  ContextPayloadTooLargeError,
  formatFromFileName,
  isContextImportFormat,
  MAX_CONTEXT_IMPORT_BYTES,
  MAX_CONTEXT_REQUEST_BYTES,
  parseContextImport,
  requestExceedsLimit,
  type ContextImportFormat,
} from '@/server/contexts';
import {
  ContextItemsError,
  saveParsedContextItems,
  type ContextItemsRequestBody,
} from '../items/route';
import { serializeContextProvider } from '../providers/route';
import { badRequest, internalError, payloadTooLarge, notFound, serviceUnavailable, unauthorized } from '@/server/http';

function field(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function jsonField(formData: FormData, name: string): unknown {
  const value = field(formData, name);
  if (!value) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function formatFromMimeType(value: string): ContextImportFormat | null {
  if (value.includes('json')) return 'json';
  if (value.includes('markdown')) return 'markdown';
  if (value.startsWith('text/')) return 'text';
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    if (requestExceedsLimit(req, MAX_CONTEXT_REQUEST_BYTES)) {
      return payloadTooLarge('context 요청은 허용된 크기를 초과할 수 없습니다.');
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return badRequest('JSON, Markdown 또는 텍스트 파일이 필요합니다.');
    if (file.size > MAX_CONTEXT_IMPORT_BYTES) {
      return payloadTooLarge('context 파일은 5MB 이하만 가져올 수 있습니다.');
    }

    const formatValue = formatFromFileName(file.name) || formatFromMimeType(file.type);
    const requestedFormat = field(formData, 'format');
    const format = requestedFormat && isContextImportFormat(requestedFormat)
      ? requestedFormat
      : formatValue;
    if (!format) return badRequest('지원 형식은 JSON, Markdown, TXT입니다.');

    const text = await file.text();
    const title = field(formData, 'title') || file.name;
    const parsedItems = parseContextImport(text, format, title);
    const explicitSourceReference = field(formData, 'sourceReference');
    const payload: ContextItemsRequestBody = {
      providerId: field(formData, 'providerId'),
      providerType: field(formData, 'providerType'),
      consentScope: jsonField(formData, 'consentScope'),
      format,
      title,
      itemType: field(formData, 'itemType'),
      sourceReference: explicitSourceReference || (format === 'json' ? undefined : `file:${file.name}`),
      occurredAt: field(formData, 'occurredAt'),
      metadata: jsonField(formData, 'metadata'),
    };

    const saved = await saveParsedContextItems(session.userId, payload, parsedItems);
    return NextResponse.json({
      provider: serializeContextProvider(saved.provider),
      items: saved.items,
      importedCount: saved.items.length,
      sourceFormat: format,
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
    return internalError(err, 'context 파일을 가져오지 못했습니다.');
  }
}
