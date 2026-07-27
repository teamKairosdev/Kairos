import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from '../db';

export function createAuth() {
  const db = getDb();
  if (!db) {
    // Demo mode: return a stub that allows demo auth
    return null;
  }

  return betterAuth({
    database: drizzleAdapter(db, { provider: 'pg' }),
    emailAndPassword: {
      enabled: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24,       // refresh every 24h
      cookieCache: {
        enabled: true,
        maxAge: 60 * 60 * 24 * 7,
      },
    },
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      },
    },
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  if (authInstance === undefined) {
    authInstance = createAuth();
  }
  return authInstance;
}
