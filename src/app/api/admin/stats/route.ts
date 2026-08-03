import { NextRequest, NextResponse } from 'next/server';
import { count, desc } from 'drizzle-orm';
import { getDb } from '@/db';
import { users, resumes, mockInterviews, atsAnalyses, careers, auditLogs } from '@/db/schema';
import { requireAdmin } from '@/server/admin';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const db = getDb();
  if (!db) {
    return NextResponse.json({
      usersCount: 0,
      resumesCount: 0,
      interviewsCount: 0,
      atsCount: 0,
      careersCount: 0,
      recentUsers: [],
      recentLogs: [],
    });
  }

  try {
    const [userRes] = await db.select({ count: count() }).from(users);
    const [resumeRes] = await db.select({ count: count() }).from(resumes);
    const [interviewRes] = await db.select({ count: count() }).from(mockInterviews);
    const [atsRes] = await db.select({ count: count() }).from(atsAnalyses);
    const [careerRes] = await db.select({ count: count() }).from(careers);
    const recentUsers = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)).limit(10);
    const recentLogs = await db.select().from(auditLogs).limit(10);

    return NextResponse.json({
      usersCount: userRes?.count || 0,
      resumesCount: resumeRes?.count || 0,
      interviewsCount: interviewRes?.count || 0,
      atsCount: atsRes?.count || 0,
      careersCount: careerRes?.count || 0,
      recentUsers,
      recentLogs,
    });
  } catch {
    return NextResponse.json({
      usersCount: 0,
      resumesCount: 0,
      interviewsCount: 0,
      atsCount: 0,
      careersCount: 0,
      recentUsers: [],
      recentLogs: [],
    });
  }
}
