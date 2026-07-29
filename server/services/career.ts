import { getDb } from 'db';
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
  const db = getDb();
  if (!db) {
    console.info('[Kairos Demo] 경력 등록 - 데모 모드 반환');
    return {
      id: 'demo-career-' + Date.now(),
      userId: data.userId,
      company: data.company,
      role: data.role,
      period: data.period,
      description: data.description,
      achievements: data.achievements || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

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
  const db = getDb();
  if (!db) {
    console.warn('[Kairos] searchCareersSemantic - DB not available in demo mode');
    return { rows: [] };
  }

  const queryEmbedding = await generateEmbedding(query);
  const vectorStr = JSON.stringify(queryEmbedding);

  try {
    const results = await db.execute(
      sql`SELECT id, company, role, period, description, achievements, created_at,
          1 - (embedding <=> ${vectorStr}::vector) AS similarity
          FROM careers
          WHERE user_id = ${userId}::uuid
          ORDER BY embedding <=> ${vectorStr}::vector ASC
          LIMIT ${limit};`
    );
    return results.rows;
  } catch {
    console.warn('[Kairos] searchCareersSemantic query failed');
    return { rows: [] };
  }
}

