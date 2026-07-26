import { db } from 'db';
import { careers } from 'db/schema';
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
  // Generate 1536-dim vector embedding of description and achievements
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

export async function searchCareersSemantic(userId: string, query: string, limit: number = 5) {
  const queryEmbedding = await generateEmbedding(query);
  const vectorStr = JSON.stringify(queryEmbedding);

  // pgvector cosine similarity search using sql template
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
