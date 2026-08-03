import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import { unauthorized } from '@/server/http';
import { getSandboxControlPlane, sandboxApiState } from '@/server/sandbox';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) return unauthorized();
  const controlPlane = getSandboxControlPlane();
  return NextResponse.json(sandboxApiState(controlPlane, session.userId));
}
