import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { toolApprovals, toolAuditLogs } from '@/db/schema';
import { getSession } from '@/server/getSession';
import {
  badRequest,
  internalError,
  notFound,
  serviceUnavailable,
  unauthorized,
} from '@/server/http';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDecision(value: unknown): 'approved' | 'rejected' | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'approve' || normalized === 'approved' || normalized === 'allow') return 'approved';
  if (normalized === 'reject' || normalized === 'rejected' || normalized === 'deny') return 'rejected';
  return null;
}

function parseExpiry(value: unknown): Date | null | 'invalid' {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'invalid' : parsed;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const session = await getSession(req);
  if (!session?.userId) return unauthorized();
  const { id } = await params;

  const db = getDb();
  if (!db) return serviceUnavailable('tool approval 저장소를 사용할 수 없습니다.');

  try {
    const [approval] = await db
      .select()
      .from(toolApprovals)
      .where(and(eq(toolApprovals.id, id), eq(toolApprovals.userId, session.userId)));
    if (!approval) return notFound('Tool approval not found');

    const auditLogs = await db
      .select()
      .from(toolAuditLogs)
      .where(and(eq(toolAuditLogs.approvalId, id), eq(toolAuditLogs.userId, session.userId)))
      .orderBy(desc(toolAuditLogs.createdAt));
    return NextResponse.json({ approval, auditLogs });
  } catch (error) {
    return internalError(error, 'tool approval을 조회하는 동안 오류가 발생했습니다.');
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getSession(req);
  if (!session?.userId) return unauthorized();
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!isRecord(parsed)) return badRequest('요청 본문이 필요합니다.');
    body = parsed;
  } catch {
    return badRequest('유효한 JSON 요청이 필요합니다.');
  }

  const decision = parseDecision(body.decision ?? body.status);
  if (!decision) return badRequest('decision은 approve 또는 reject여야 합니다.');
  const expiry = parseExpiry(body.expiresAt);
  if (expiry === 'invalid') return badRequest('expiresAt 형식이 올바르지 않습니다.');
  if (expiry instanceof Date && expiry.getTime() <= Date.now()) {
    return badRequest('expiresAt은 현재 시각 이후여야 합니다.');
  }

  const db = getDb();
  if (!db) return serviceUnavailable('tool approval 저장소를 사용할 수 없습니다.');

  try {
    const [existing] = await db
      .select()
      .from(toolApprovals)
      .where(and(eq(toolApprovals.id, id), eq(toolApprovals.userId, session.userId)));
    if (!existing) return notFound('Tool approval not found');
    if (existing.status !== 'pending') return badRequest('이미 결정된 tool approval입니다.');

    const decidedAt = new Date();
    const decisionCode =
      typeof body.decisionCode === 'string' && body.decisionCode.trim()
        ? body.decisionCode.trim().slice(0, 50)
        : decision === 'approved'
          ? 'USER_APPROVED'
          : 'USER_REJECTED';
    const [approval] = await db
      .update(toolApprovals)
      .set({
        status: decision,
        decisionCode,
        decidedAt,
        expiresAt: expiry,
      })
      .where(and(eq(toolApprovals.id, id), eq(toolApprovals.userId, session.userId)))
      .returning();
    if (!approval) return notFound('Tool approval not found');

    await db.insert(toolAuditLogs).values({
      userId: session.userId,
      runId: existing.runId,
      approvalId: existing.id,
      toolName: existing.toolName,
      action: 'approval-decision',
      outcome: decision,
      argumentsHash: existing.argumentsHash,
      createdAt: decidedAt,
    });

    return NextResponse.json({ approval });
  } catch (error) {
    return internalError(error, 'tool approval을 결정하는 동안 오류가 발생했습니다.');
  }
}
