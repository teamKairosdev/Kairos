import { db } from 'db';
import { mockInterviews } from 'db/schema';
import { eq, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId;

  if (!userId) {
    return [
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
  }

  return await db
    .select()
    .from(mockInterviews)
    .where(eq(mockInterviews.userId, userId))
    .orderBy(desc(mockInterviews.createdAt));
});
