import { getAuth } from '../auth';

async function hmacVerify(token: string, secret: string): Promise<{ userId: string; email: string; name: string } | null> {
  try {
    const [bodyB64, signatureB64] = token.split('.');
    if (!bodyB64 || !signatureB64) return null;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const sigBytes = Uint8Array.from(Buffer.from(signatureB64, 'base64url'));
    const bodyBytes = new TextEncoder().encode(bodyB64);

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, bodyBytes);
    if (!valid) return null;

    const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;

    return { userId: payload.userId, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;
  if (path.startsWith('/api/auth') || path === '/' || path.startsWith('/_nuxt') || path.startsWith('/__nuxt')) {
    return;
  }

  const auth = getAuth();

  if (auth) {
    try {
      const session = await auth.api.getSession({ headers: getRequestHeaders(event) as any });
      if (session) {
        event.context.user = { userId: session.user.id, email: session.user.email, name: session.user.name };
        event.context.session = session;
        return;
      }
    } catch {
      // Session invalid, fall through
    }
  }

  const config = useRuntimeConfig();
  const jwtSecret = process.env.JWT_SECRET || config.jwtSecret;

  const authHeader = getRequestHeader(event, 'authorization');
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    token = getCookie(event, 'kairos_token');
  }

  if (token && jwtSecret) {
    const decoded = await hmacVerify(token, jwtSecret);
    if (decoded) {
      event.context.user = decoded;
    }
  }
});
