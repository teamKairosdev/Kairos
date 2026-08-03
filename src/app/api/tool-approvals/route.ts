import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { agentRuns, toolApprovals, toolAuditLogs } from '@/db/schema';
import { classifyToolRisk, hashValue, isToolExecutionProhibited } from '@/server/harness';
import { getSession } from '@/server/getSession';
import {
  badRequest,
  internalError,
  notFound,
  serviceUnavailable,
  unauthorized,
} from '@/server/http';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value || '50', 10);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(100, Math.max(1, parsed));
}

function parseExpiry(value: unknown): Date | null | 'invalid' {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'invalid' : parsed;
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) return unauthorized();

  const db = getDb();
  if (!db) return serviceUnavailable('tool approval 저장소를 사용할 수 없습니다.');

  const status = req.nextUrl.searchParams.get('status');
  const runId = req.nextUrl.searchParams.get('runId');
  const filters = [eq(toolApprovals.userId, session.userId)];
  if (status) filters.push(eq(toolApprovals.status, status));
  if (runId) filters.push(eq(toolApprovals.runId, runId));

  try {
    const approvals = await db
      .select()
      .from(toolApprovals)
      .where(and(...filters))
      .orderBy(desc(toolApprovals.createdAt))
      .limit(parseLimit(req.nextUrl.searchParams.get('limit')));
    return NextResponse.json({ approvals });
  } catch (error) {
    return internalError(error, 'tool approval을 조회하는 동안 오류가 발생했습니다.');
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) return unauthorized();

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!isRecord(parsed)) return badRequest('요청 본문이 필요합니다.');
    body = parsed;
  } catch {
    return badRequest('유효한 JSON 요청이 필요합니다.');
  }

  const toolName = typeof body.toolName === 'string' ? body.toolName.trim() : '';
  if (!toolName || toolName.length > 100) return badRequest('toolName이 필요합니다.');
  if (isToolExecutionProhibited(toolName)) {
    return badRequest('이 실행형 도구는 MVP에서 승인할 수 없습니다.');
  }

  const riskLevel = classifyToolRisk(toolName);
  const expiry = parseExpiry(body.expiresAt);
  if (expiry === 'invalid') return badRequest('expiresAt 형식이 올바르지 않습니다.');
  if (expiry instanceof Date && expiry.getTime() <= Date.now()) {
    return badRequest('expiresAt은 현재 시각 이후여야 합니다.');
  }

  const runId = typeof body.runId === 'string' && body.runId.trim() ? body.runId.trim() : null;
  const argumentsHash =
    body.arguments !== undefined
      ? hashValue(body.arguments)
      : typeof body.argumentsHash === 'string' && /^[a-f0-9]{64,128}$/i.test(body.argumentsHash)
        ? body.argumentsHash.toLowerCase()
        : hashValue(null);
  const readAutomaticallyApproved = riskLevel === 'read';
  const now = new Date();

  const db = getDb();
  if (!db) return serviceUnavailable('tool approval 저장소를 사용할 수 없습니다.');

  try {
    if (runId) {
      const [ownedRun] = await db
        .select({ id: agentRuns.id })
        .from(agentRuns)
        .where(and(eq(agentRuns.id, runId), eq(agentRuns.userId, session.userId)));
      if (!ownedRun) return notFound('Run not found');
    }

    const [approval] = await db
      .insert(toolApprovals)
      .values({
        userId: session.userId,
        runId,
        toolName,
        argumentsHash,
        riskLevel,
        status: readAutomaticallyApproved ? 'approved' : 'pending',
        decisionCode: readAutomaticallyApproved ? 'AUTO_READ_ALLOWED' : null,
        decidedAt: readAutomaticallyApproved ? now : null,
        expiresAt: expiry,
      })
      .returning();
    if (!approval) return internalError(new Error('APPROVAL_CREATE_FAILED'), 'tool approval을 생성할 수 없습니다.');

    await db.insert(toolAuditLogs).values({
      userId: session.userId,
      runId,
      approvalId: approval.id,
      toolName,
      action: 'approval-created',
      outcome: readAutomaticallyApproved ? 'allowed' : 'pending',
      argumentsHash,
      createdAt: now,
    });

    return NextResponse.json({
      approval,
      riskLevel,
      allowed: readAutomaticallyApproved,
      requiresApproval: !readAutomaticallyApproved,
    }, { status: 201 });
  } catch (error) {
    return internalError(error, 'tool approval을 생성하는 동안 오류가 발생했습니다.');
  }
}
