import { NextResponse } from 'next/server';

export function unauthorized(message = '로그인이 필요합니다.'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = '접근 권한이 없습니다.'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function payloadTooLarge(message = '파일 용량이 제한을 초과했습니다.'): NextResponse {
  return NextResponse.json({ error: message }, { status: 413 });
}

export function notFound(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serviceUnavailable(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 503 });
}

export function errorMessage(err: unknown, fallback: string): string {
  // Provider, database, and filesystem errors can contain secrets or internal paths.
  // Keep the detailed error in server logs and expose only the route-level message.
  void err;
  return fallback;
}

export function internalError(err: unknown, fallback: string): NextResponse {
  return NextResponse.json({ error: errorMessage(err, fallback) }, { status: 500 });
}

export const DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS = 15_000;

/** Fetch external services with a bounded connection/headers wait. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(init.signal?.reason);
  if (init.signal) {
    if (init.signal.aborted) forwardAbort();
    else init.signal.addEventListener('abort', forwardAbort, { once: true });
  }
  const timeoutId = setTimeout(() => controller.abort(new Error('External request timed out')), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    init.signal?.removeEventListener('abort', forwardAbort);
  }
}
