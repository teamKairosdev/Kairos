import { NextResponse } from 'next/server';

export function unauthorized(message = '로그인이 필요합니다.'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
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
