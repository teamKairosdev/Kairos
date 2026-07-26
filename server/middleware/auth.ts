import jwt from 'jsonwebtoken';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const jwtSecret = process.env.JWT_SECRET || config.jwtSecret;

  // Extract auth header or cookie
  const authHeader = getRequestHeader(event, 'authorization');
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    token = getCookie(event, 'kairos_token');
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string; name: string };
      event.context.user = decoded;
    } catch {
      // Invalid/expired token
      event.context.user = undefined;
    }
  }
});
