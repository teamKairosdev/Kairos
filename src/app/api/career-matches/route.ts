import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { careerDiaryEntries, careerGoals, careerMatchSuggestions, careers } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, unauthorized } from '@/server/http';
import {
  CAREER_PLANNING_DISCLAIMER,
  calculateCareerFit,
  calculateCareerMatch,
  careerFitInputFromCandidate,
  careerFitReasonCodes,
  createFallbackMatch,
  getFallbackGoal,
  hashJobReference,
  listFallbackDiary,
  listFallbackGoals,
  listFallbackMatches,
  normalizeCandidates,
  serializeCareerFitRationale,
  type CareerFitAssessment,
  type CareerMatchCandidate,
} from '@/server/careerPlanning';

const RECOMMENDATION_TYPE = 'candidate-job-recommendation';

function demoJson(data: unknown): NextResponse {
  const response = NextResponse.json(data);
  response.headers.set('X-Kairos-Demo', '1');
  return response;
}

function responseSuggestion<T extends { matchScore: number; reasonCodes: string[]; rationale: string | null }>(
  suggestion: T,
  assessment?: CareerFitAssessment | null,
) {
  return {
    ...suggestion,
    ...(assessment ? { assessment } : {}),
    recommendationType: RECOMMENDATION_TYPE,
    disclaimer: CAREER_PLANNING_DISCLAIMER,
  };
}

function readGoalId(body: Record<string, unknown>): string | null {
  return typeof body.goalId === 'string' && body.goalId.trim() ? body.goalId.trim() : null;
}

function assessCandidate(
  candidate: CareerMatchCandidate,
  body: Record<string, unknown>,
  context: Parameters<typeof calculateCareerMatch>[1],
): CareerFitAssessment | null {
  const input = careerFitInputFromCandidate(candidate, body.profile ?? body);
  if (!input.requirements.trim()) return null;
  return calculateCareerFit(input, context);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const goalId = req.nextUrl.searchParams.get('goalId') || undefined;
    const db = getDb();
    if (!db) {
      return demoJson(listFallbackMatches(session.userId, goalId).map((suggestion) => responseSuggestion(suggestion)));
    }

    const filters = [eq(careerMatchSuggestions.userId, session.userId)];
    if (goalId) filters.push(eq(careerMatchSuggestions.goalId, goalId));
    const suggestions = await db
      .select()
      .from(careerMatchSuggestions)
      .where(and(...filters))
      .orderBy(desc(careerMatchSuggestions.createdAt));
    return NextResponse.json(suggestions.map((suggestion) => responseSuggestion(suggestion)));
  } catch (err: unknown) {
    return internalError(err, '후보 직무 추천을 불러오지 못했습니다.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    let body: Record<string, unknown>;
    try {
      body = await req.json() as Record<string, unknown>;
    } catch {
      return badRequest('요청 본문이 올바르지 않습니다.');
    }
    if (!body || Array.isArray(body)) return badRequest('요청 본문이 올바르지 않습니다.');

    const candidates = normalizeCandidates(body);
    if (candidates.length === 0) return badRequest('추천할 후보 직무를 하나 이상 입력해주세요.');
    const goalId = readGoalId(body);
    const db = getDb();

    if (!db) {
      if (goalId && !getFallbackGoal(session.userId, goalId)) {
        return notFound('목표를 찾을 수 없거나 권한이 없습니다.');
      }
      const allGoals = listFallbackGoals(session.userId);
      const context = {
        careers: [],
        diaryEntries: listFallbackDiary(session.userId),
        goals: goalId ? allGoals.filter((goal) => goal.id === goalId) : allGoals,
      };
      const assessments = candidates.map((candidate) => assessCandidate(candidate, body, context));
      const results = candidates.map((candidate, index) => {
        const match = calculateCareerMatch(candidate, context);
        const assessment = assessments[index];
        const reasonCodes = Array.from(new Set([
          ...match.reasonCodes,
          ...(assessment ? careerFitReasonCodes(assessment) : []),
        ]));
        return createFallbackMatch({
          userId: session.userId,
          goalId,
          jobTitle: candidate.jobTitle,
          companyName: candidate.companyName ?? null,
          jobReferenceHash: hashJobReference(candidate),
          matchScore: assessment?.recommendationFitScore ?? match.matchScore,
          reasonCodes,
          rationale: assessment ? serializeCareerFitRationale(assessment) : match.rationale,
          status: 'new',
          expiresAt: null,
        });
      });
      const response = results.map((suggestion, index) => responseSuggestion(
        suggestion,
        assessments[index],
      ));
      return demoJson(response.length === 1 ? response[0] : response);
    }

    if (goalId) {
      const [goal] = await db
        .select({ id: careerGoals.id })
        .from(careerGoals)
        .where(and(eq(careerGoals.id, goalId), eq(careerGoals.userId, session.userId)));
      if (!goal) return notFound('목표를 찾을 수 없거나 권한이 없습니다.');
    }

    const [careerRecords, diaryEntries, goals] = await Promise.all([
      db.select().from(careers).where(eq(careers.userId, session.userId)),
      db.select().from(careerDiaryEntries).where(eq(careerDiaryEntries.userId, session.userId)),
      db.select().from(careerGoals).where(eq(careerGoals.userId, session.userId)),
    ]);
    const context = {
      careers: careerRecords,
      diaryEntries,
      goals: goalId ? goals.filter((goal) => goal.id === goalId) : goals,
    };
    const assessments = candidates.map((candidate: CareerMatchCandidate) => assessCandidate(candidate, body, context));
    const rows = candidates.map((candidate: CareerMatchCandidate, index) => {
      const match = calculateCareerMatch(candidate, context);
      const assessment = assessments[index];
      return {
        userId: session.userId,
        goalId,
        jobTitle: candidate.jobTitle,
        companyName: candidate.companyName ?? null,
        jobReferenceHash: hashJobReference(candidate),
        matchScore: assessment?.recommendationFitScore ?? match.matchScore,
        reasonCodes: Array.from(new Set([
          ...match.reasonCodes,
          ...(assessment ? careerFitReasonCodes(assessment) : []),
        ])),
        rationale: assessment ? serializeCareerFitRationale(assessment) : match.rationale,
        status: 'new',
      };
    });
    const inserted = await db.insert(careerMatchSuggestions).values(rows).returning();
    const response = inserted.map((suggestion, index) => responseSuggestion(suggestion, assessments[index]));
    return NextResponse.json(response.length === 1 ? response[0] : response);
  } catch (err: unknown) {
    return internalError(err, '후보 직무 추천을 생성하지 못했습니다.');
  }
}
