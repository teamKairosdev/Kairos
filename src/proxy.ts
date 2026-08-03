import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PROTECTED_PATHS = [
  '/resume',
  '/interview',
  '/ats',
  '/humanizer',
  '/qa',
  '/career',
  '/studio',
  '/docs',
  '/community',
  '/settings',
  '/admin',
];

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || '';
  if (!secret) return new Uint8Array(0);
  return new TextEncoder().encode(secret);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PATHS.some(p =>
    pathname === p || pathname.startsWith(p + '/')
  );

  if (!isProtected) return NextResponse.next();

  if (process.env.NODE_ENV !== 'production' && req.cookies.get('kairos_mock_session')?.value === '1') {
    return NextResponse.next();
  }

  const token = req.cookies.get('kairos_session')?.value;
  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = getJwtSecret();
    if (secret.length === 0) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/auth/login';
      return NextResponse.redirect(loginUrl);
    }
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/resume/:path*',
    '/interview/:path*',
    '/ats/:path*',
    '/humanizer/:path*',
    '/qa/:path*',
    '/career/:path*',
    '/studio/:path*',
    '/docs/:path*',
    '/community/:path*',
    '/settings/:path*',
    '/admin/:path*',
  ],
};
