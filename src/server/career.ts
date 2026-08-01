/**
 * Career service ported from server/services/career.ts
 */
import { getDb } from '@/db';
import { careers } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { generateEmbedding } from './embedding';

export async function createCareerEntry(data: {
  userId: string;
  company: string;
  role: string;
  period: string;
  description: string;
  achievements?: string[];
}) {
  const db = getDb();
  if (!db) {
    return {
      id: 'demo-career-' + Date.now(),
      userId: data.userId,
      company: data.company,
      role: data.role,
      period: data.period,
      description: data.description,
      achievements: data.achievements || [],
      createdAt: new Date(),
    };
  }

  const textToEmbed = `${data.company} ${data.role}: ${data.description} ${data.achievements?.join(' ') || ''}`;
  const embedding = await generateEmbedding(textToEmbed);

  const [inserted] = await db
    .insert(careers)
    .values({
      userId: data.userId,
      company: data.company,
      role: data.role,
      period: data.period,
      description: data.description,
      achievements: data.achievements || [],
      embedding,
    })
    .returning();

  return inserted;
}

export async function searchCareersSemantic(userId: string, query: string, limit = 5) {
  const db = getDb();
  if (!db) {
    throw new Error('Database connection is not available in demo mode');
  }

  const queryEmbedding = await generateEmbedding(query);
  const vectorStr = JSON.stringify(queryEmbedding);

  const results = await db.execute(
    sql`SELECT id, company, role, period, description, achievements, created_at,
        1 - (embedding <=> ${vectorStr}::vector) AS similarity
        FROM careers
        WHERE user_id = ${userId}::uuid
        ORDER BY embedding <=> ${vectorStr}::vector ASC
        LIMIT ${limit};`
  );

  return results.rows;
}
