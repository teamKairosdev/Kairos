import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('[Kairos] DATABASE_URL not set - running in demo mode');
    return null;
  }

  try {
    const sql = neon(connectionString);
    dbInstance = drizzle(sql, { schema });
    return dbInstance;
  } catch (err: any) {
    console.warn('[Kairos] DB initialization failed - running in demo mode:', err.message);
    return null;
  }
}

export const db = getDb();
