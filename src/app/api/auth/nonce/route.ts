import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { WALLET_NONCE_COOKIE, WALLET_NONCE_TTL_SECONDS } from '@/server/auth';

export async function GET() {
  const nonce = randomBytes(32).toString('base64url');
  const response = NextResponse.json({ nonce });
  response.cookies.set(WALLET_NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: WALLET_NONCE_TTL_SECONDS,
    path: '/api/auth',
  });
  return response;
}
