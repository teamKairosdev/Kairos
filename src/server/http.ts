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

export function internalError(err: { message?: string }, fallback: string): NextResponse {
  return NextResponse.json({ error: err.message || fallback }, { status: 500 });
}
