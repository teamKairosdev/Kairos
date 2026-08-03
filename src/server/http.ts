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
  return typeof err === 'object' && err !== null && 'message' in err
    ? String((err as { message: unknown }).message) || fallback
    : fallback;
}

export function internalError(err: unknown, fallback: string): NextResponse {
  return NextResponse.json({ error: errorMessage(err, fallback) }, { status: 500 });
}
