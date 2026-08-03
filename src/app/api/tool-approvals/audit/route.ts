import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { toolAuditLogs } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { internalError, serviceUnavailable, unauthorized } from '@/server/http';

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value || '100', 10);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(200, Math.max(1, parsed));
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) return unauthorized();

  const db = getDb();
  if (!db) return serviceUnavailable('tool audit log 저장소를 사용할 수 없습니다.');

  const filters = [eq(toolAuditLogs.userId, session.userId)];
  const runId = req.nextUrl.searchParams.get('runId');
  const toolName = req.nextUrl.searchParams.get('toolName');
  if (runId) filters.push(eq(toolAuditLogs.runId, runId));
  if (toolName) filters.push(eq(toolAuditLogs.toolName, toolName));

  try {
    const auditLogs = await db
      .select()
      .from(toolAuditLogs)
      .where(and(...filters))
      .orderBy(desc(toolAuditLogs.createdAt))
      .limit(parseLimit(req.nextUrl.searchParams.get('limit')));
    return NextResponse.json({ auditLogs });
  } catch (error) {
    return internalError(error, 'tool audit log를 조회하는 동안 오류가 발생했습니다.');
  }
}
