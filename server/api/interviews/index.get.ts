import { getDb } from 'db';
import { mockInterviews } from 'db/schema';
import { eq, desc } from 'drizzle-orm';

const MOCK_INTERVIEWS = [
  {
    id: 'demo-interview-1',
    jobTitle: 'Senior Frontend Engineer',
    companyName: 'Kairos Labs',
    difficulty: 'medium',
    status: 'completed',
    overallScore: 88,
    createdAt: new Date(),
  }
];

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId;

  if (!userId) {
    return MOCK_INTERVIEWS;
  }

  try {
    const db = getDb();
    if (db) {
      return await db
        .select()
        .from(mockInterviews)
        .where(eq(mockInterviews.userId, userId))
        .orderBy(desc(mockInterviews.createdAt));
    }
  } catch {
    console.warn('[Kairos] interviews/index.get.ts DB fetch failed (demo mode)');
  }

  return MOCK_INTERVIEWS;
});

