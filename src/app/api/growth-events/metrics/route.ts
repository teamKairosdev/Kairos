import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { mentorTasks } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { internalError, serviceUnavailable, unauthorized } from '@/server/http';
import { calculateMentorMetrics } from '@/server/mentor';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    const tasks = await db
      .select({ status: mentorTasks.status, completedAt: mentorTasks.completedAt, updatedAt: mentorTasks.updatedAt })
      .from(mentorTasks)
      .where(eq(mentorTasks.userId, session.userId));
    return NextResponse.json(calculateMentorMetrics(tasks));
  } catch (error: unknown) {
    return internalError(error, '성장 지표를 계산하지 못했습니다.');
  }
}
