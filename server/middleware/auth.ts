import { getAuth } from '../auth';
import jwt from 'jsonwebtoken';

export default defineEventHandler(async (event) => {
  // Skip auth for public routes
  const path = getRequestURL(event).pathname;
  if (path.startsWith('/api/auth') || path === '/' || path.startsWith('/_nuxt') || path.startsWith('/__nuxt')) {
    return;
  }

  const auth = getAuth();

  if (auth) {
    // Production: Better Auth session validation
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

  // Fallback: manual JWT for demo mode
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
    try {
      const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string; name: string };
      event.context.user = decoded;
    } catch {
      event.context.user = undefined;
    }
  }
});
