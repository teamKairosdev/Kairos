import { count } from 'drizzle-orm';
import { getDb } from '../../../db';
import { users, resumes, mockInterviews, atsAnalyses, careers, auditLogs } from '../../../db/schema';

export default defineEventHandler(async () => {
  const db = getDb();
  if (!db) {
    return {
      usersCount: 0,
      resumesCount: 0,
      interviewsCount: 0,
      atsCount: 0,
      careersCount: 0,
      mfaUsersCount: 0,
      recentLogs: [],
    };
  }

  try {
    const [userRes] = await db.select({ count: count() }).from(users);
    const [resumeRes] = await db.select({ count: count() }).from(resumes);
    const [interviewRes] = await db.select({ count: count() }).from(mockInterviews);
    const [atsRes] = await db.select({ count: count() }).from(atsAnalyses);
    const [careerRes] = await db.select({ count: count() }).from(careers);

    const recentLogs = await db
      .select()
      .from(auditLogs)
      .limit(10);

    return {
      usersCount: userRes?.count || 0,
      resumesCount: resumeRes?.count || 0,
      interviewsCount: interviewRes?.count || 0,
      atsCount: atsRes?.count || 0,
      careersCount: careerRes?.count || 0,
      recentLogs,
    };
  } catch (err) {
    return {
      usersCount: 0,
      resumesCount: 0,
      interviewsCount: 0,
      atsCount: 0,
      careersCount: 0,
      recentLogs: [],
    };
  }
});
