import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { buildGoogleAuthUrl } from '@/server/auth';

export async function GET() {
  const state = randomBytes(32).toString('base64url');
  const authUrl = buildGoogleAuthUrl(state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 mins
    path: '/',
  });

  return res;
}
