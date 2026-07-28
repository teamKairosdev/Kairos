import { getAuth } from '../auth';

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;
  if (path.startsWith('/api/auth') || path === '/' || path.startsWith('/_nuxt') || path.startsWith('/__nuxt')) {
    return;
  }

  const auth = getAuth();
  if (!auth) return;

  try {
    const session = await auth.api.getSession({ headers: getRequestHeaders(event) as any });
    if (session) {
      event.context.user = { userId: session.user.id, email: session.user.email, name: session.user.name };
      event.context.session = session;
    }
  } catch {
    // Session invalid
  }
});
