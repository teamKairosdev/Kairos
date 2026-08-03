import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import { internalError, notFound, unauthorized } from '@/server/http';
import { getSandboxControlPlane } from '@/server/sandbox';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id } = await params;
    const details = getSandboxControlPlane().getJobDetails(session.userId, id);
    if (!details) return notFound('sandbox job을 찾을 수 없습니다.');
    return NextResponse.json(details);
  } catch (error) {
    return internalError(error, 'sandbox 결과를 불러오지 못했습니다.');
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id } = await params;
    const job = await getSandboxControlPlane().cancel(session.userId, id);
    if (!job) return notFound('sandbox job을 찾을 수 없습니다.');
    return NextResponse.json({ status: job.status, job, result: null });
  } catch (error) {
    return internalError(error, 'sandbox job을 취소하지 못했습니다.');
  }
}
