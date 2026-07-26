import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let dbUnavailable = false;

export function getDb() {
  if (dbUnavailable) return null as any;
  if (!dbInstance) {
    const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/kairos';

    try {
      poolInstance = new Pool({
        connectionString,
        max: 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 3000,
      });

      // Catch pool-level errors silently so demo mode doesn't crash
      poolInstance.on('error', (err) => {
        console.warn('[Kairos] DB pool error (demo mode: DB ops will be skipped):', err.message);
        dbUnavailable = true;
      });

      dbInstance = drizzle(poolInstance, { schema });
    } catch (err: any) {
      console.warn('[Kairos] DB initialization failed - running in demo mode:', err.message);
      dbUnavailable = true;
      return null as any;
    }
  }

  return dbInstance;
}

export const db = getDb();

