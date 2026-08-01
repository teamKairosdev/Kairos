import { NextResponse } from 'next/server';
import { buildGoogleAuthUrl } from '@/server/auth';

export async function GET() {
  const state = Math.random().toString(36).substring(2, 15);
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
