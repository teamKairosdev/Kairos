/**
 * GCP OAuth2 직접 연동 세션 관리 유틸리티
 * Better Auth 없이, Google OAuth2 표준 흐름으로 인증.
 * JWT는 jose 라이브러리로 서명/검증.
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface KairosUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  walletAddress?: string | null;
}

export interface KairosSession extends JWTPayload {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

function getJwtSecret(): Uint8Array {
  const config = useRuntimeConfig();
  const secret = config.jwtSecret as string;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET가 설정되지 않았거나 32자 미만입니다.');
  }
  return new TextEncoder().encode(secret);
}

/** JWT 발급 (7일 유효) */
export async function signSession(user: KairosUser): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

/** JWT 검증 및 세션 파싱 */
export async function verifySession(token: string): Promise<KairosSession | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as KairosSession;
  } catch {
    return null;
  }
}

/** Google OAuth2 Authorization URL 생성 */
export function buildGoogleAuthUrl(state: string): string {
  const config = useRuntimeConfig();
  const clientId = config.googleClientId as string;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID가 설정되지 않았습니다.');

  const baseUrl = process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Google OAuth2 code → access_token + id_token 교환 */
export async function exchangeGoogleCode(code: string): Promise<{
  accessToken: string;
  idToken: string;
}> {
  const config = useRuntimeConfig();
  const clientId = config.googleClientId as string;
  const clientSecret = config.googleClientSecret as string;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID 또는 GOOGLE_CLIENT_SECRET이 설정되지 않았습니다.');
  }

  const baseUrl = process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google 토큰 교환 실패: ${err}`);
  }

  const data = await res.json() as { access_token: string; id_token: string };
  return { accessToken: data.access_token, idToken: data.id_token };
}

/** Google UserInfo API로 프로필 조회 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<{
  sub: string;
  email: string;
  name: string;
  picture?: string;
}> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error('Google 사용자 정보 조회 실패');
  return res.json();
}
