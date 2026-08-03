import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import {
  checkSandboxToolApproval,
  findOwnedSandboxApproval,
  getSandboxControlPlane,
  normalizeSandboxJobRequest,
  SandboxBoundaryError,
  sandboxApiState,
  type SandboxJobSubmissionRequest,
} from '@/server/sandbox';

const MAX_SANDBOX_REQUEST_BYTES = 160 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function notConfiguredResponse(
  controlPlane: ReturnType<typeof getSandboxControlPlane>,
  job: ReturnType<ReturnType<typeof getSandboxControlPlane>['getJob']>,
) {
  const status = controlPlane.getStatus();
  return NextResponse.json({
    status: 'not_configured',
    availability: status.availability,
    backendStatus: status.status,
    backend: status.backend,
    execution: status.execution,
    code: 'SANDBOX_NOT_CONFIGURED',
    reason: status.reason,
    capabilities: controlPlane.getCapabilities(),
    job,
  }, { status: 503 });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const controlPlane = getSandboxControlPlane();
    const jobId = req.nextUrl.searchParams.get('jobId');
    if (jobId && !controlPlane.getJob(session.userId, jobId)) return notFound('sandbox job을 찾을 수 없습니다.');
    return NextResponse.json(sandboxApiState(controlPlane, session.userId, jobId));
  } catch (error) {
    return internalError(error, 'sandbox 상태를 불러오지 못했습니다.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const contentLength = Number(req.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_SANDBOX_REQUEST_BYTES) {
      return badRequest('sandbox 요청 크기가 제한을 초과했습니다.');
    }
    const parsed = await req.json().catch(() => null);
    if (!isRecord(parsed)) return badRequest('sandbox 요청 본문이 필요합니다.');
    if (new TextEncoder().encode(JSON.stringify(parsed)).byteLength > MAX_SANDBOX_REQUEST_BYTES) {
      return badRequest('sandbox 요청 크기가 제한을 초과했습니다.');
    }

    const controlPlane = getSandboxControlPlane();
    if (parsed.operation === 'status' || parsed.operation === 'capabilities') {
      return NextResponse.json(sandboxApiState(controlPlane, session.userId));
    }
    if (parsed.operation === 'cancel') {
      const jobId = typeof parsed.jobId === 'string' ? parsed.jobId : '';
      if (!jobId) return badRequest('취소할 sandbox jobId가 필요합니다.');
      const job = await controlPlane.cancel(session.userId, jobId);
      if (!job) return notFound('sandbox job을 찾을 수 없습니다.');
      return NextResponse.json({ job, result: null });
    }
    if (parsed.operation === 'result') {
      const jobId = typeof parsed.jobId === 'string' ? parsed.jobId : '';
      if (!jobId) return badRequest('조회할 sandbox jobId가 필요합니다.');
      const details = controlPlane.getJobDetails(session.userId, jobId);
      if (!details) return notFound('sandbox job을 찾을 수 없습니다.');
      return NextResponse.json(details);
    }

    let request: ReturnType<typeof normalizeSandboxJobRequest>;
    try {
      request = normalizeSandboxJobRequest(parsed, session.userId);
    } catch (error) {
      if (error instanceof SandboxBoundaryError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
      }
      throw error;
    }

    let approval = null;
    if (request.approvalId) {
      const db = getDb();
      if (!db) return serviceUnavailable('sandbox tool approval 저장소를 사용할 수 없습니다.');
      approval = await findOwnedSandboxApproval(db, session.userId, request.approvalId);
      if (!approval) return notFound('tool approval을 찾을 수 없습니다.');
    }
    try {
      checkSandboxToolApproval(request, approval);
    } catch (error) {
      if (error instanceof SandboxBoundaryError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
      }
      throw error;
    }

    const jobRequest: SandboxJobSubmissionRequest = {
      userId: request.userId,
      approvalId: request.approvalId,
      toolName: request.toolName,
      action: request.action,
      input: request.input,
      timeoutMs: request.timeoutMs,
      maxOutputBytes: request.maxOutputBytes,
      networkPolicy: request.networkPolicy,
      toolActionHash: request.toolActionHash,
    };
    const job = await controlPlane.submit(jobRequest);
    if (job.status === 'disabled') return notConfiguredResponse(controlPlane, job);
    return NextResponse.json({
      status: job.status,
      availability: 'available',
      backend: job.backend,
      job,
      result: null,
      capabilities: controlPlane.getCapabilities(),
      toolActionHash: request.toolActionHash,
    }, { status: job.status === 'completed' ? 201 : 202 });
  } catch (error) {
    return internalError(error, 'sandbox job을 생성하지 못했습니다.');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    let jobId = req.nextUrl.searchParams.get('jobId') || '';
    if (!jobId) {
      const body = await req.json().catch(() => null);
      if (isRecord(body) && typeof body.jobId === 'string') jobId = body.jobId;
    }
    if (!jobId || jobId.length > 200) return badRequest('취소할 sandbox jobId가 필요합니다.');
    const controlPlane = getSandboxControlPlane();
    const job = await controlPlane.cancel(session.userId, jobId);
    if (!job) return notFound('sandbox job을 찾을 수 없습니다.');
    return NextResponse.json({ status: job.status, job, result: null });
  } catch (error) {
    return internalError(error, 'sandbox job을 취소하지 못했습니다.');
  }
}
