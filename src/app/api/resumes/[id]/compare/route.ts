import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { resumes } from '@/db/schema';
import { and, eq, ne } from 'drizzle-orm';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import { buildResumeComparison, type ResumeCohortEntry } from '@/server/resumeCompare';

const MAX_JOB_DESCRIPTION_LENGTH = 30_000;

function normalizeJobDescription(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_JOB_DESCRIPTION_LENGTH) : '';
}

function jsonResponse(payload: unknown): NextResponse {
  const response = NextResponse.json(payload);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

async function compareResume(
  req: NextRequest,
  id: string,
  jobDescription: string,
  authenticatedSession?: { userId: string },
): Promise<NextResponse> {
  const session = authenticatedSession || await getSession(req);
  if (!session?.userId) return unauthorized();

  const db = getDb();
  if (!db) return serviceUnavailable('이력서 비교 저장소를 사용할 수 없습니다.');

  const [resume] = await db
    .select({ id: resumes.id, originalContent: resumes.originalContent })
    .from(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, session.userId)));
  if (!resume) return notFound('Resume not found');

  const cohortRows = await db
    .select({ userId: resumes.userId, originalContent: resumes.originalContent })
    .from(resumes)
    .where(ne(resumes.userId, session.userId));

  const comparison = buildResumeComparison(
    resume.originalContent,
    (cohortRows || []) as ResumeCohortEntry[],
    jobDescription,
  );
  return jsonResponse(comparison);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const jobDescription = normalizeJobDescription(req.nextUrl.searchParams.get('jobDescription'));
    return await compareResume(req, id, jobDescription);
  } catch (err: unknown) {
    return internalError(err, '이력서 비교를 계산하지 못했습니다.');
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      return badRequest('요청 본문이 올바르지 않습니다.');
    }

    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return badRequest('요청 본문이 올바르지 않습니다.');
    }
    const value = body as Record<string, unknown>;
    const jobDescription = normalizeJobDescription(value.jobDescription ?? value.jobPosting);
    return await compareResume(req, id, jobDescription, session);
  } catch (err: unknown) {
    return internalError(err, '이력서 비교를 계산하지 못했습니다.');
  }
}
