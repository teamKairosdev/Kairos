import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { careerDiaryEntries, careerGoals, careerMatchSuggestions, careers } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, unauthorized } from '@/server/http';
import {
  CAREER_FIT_DISCLAIMER,
  CAREER_PLANNING_DISCLAIMER,
  calculateCareerFit,
  calculateCareerMatch,
  careerFitReasonCodes,
  createFallbackMatch,
  getFallbackGoal,
  hashJobReference,
  listFallbackDiary,
  listFallbackGoals,
  normalizeCareerFitInput,
  normalizeCandidate,
  serializeCareerFitRationale,
  type CareerFitAssessment,
  type CareerMatchContext,
} from '@/server/careerPlanning';

const RECOMMENDATION_TYPE = 'candidate-job-recommendation';

function demoJson(data: unknown): NextResponse {
  const response = NextResponse.json(data);
  response.headers.set('X-Kairos-Demo', '1');
  return response;
}

function responseSuggestion<T extends { matchScore: number; reasonCodes: string[]; rationale: string | null }>(
  suggestion: T,
  assessment?: CareerFitAssessment,
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

function readSaveFlag(body: Record<string, unknown>): boolean {
  return body.save === true || body.saveResult === true;
}

function buildContext(
  careersValue: CareerMatchContext['careers'],
  diaryEntries: CareerMatchContext['diaryEntries'],
  goals: CareerMatchContext['goals'],
): CareerMatchContext {
  return { careers: careersValue, diaryEntries, goals };
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

    const input = normalizeCareerFitInput(body);
    if (!input?.jobTitle) return badRequest('직무명을 입력해주세요.');
    if (!input.requirements.trim()) return badRequest('공고 요건을 입력해주세요.');

    const goalId = readGoalId(body);
    const db = getDb();
    let context: CareerMatchContext;

    if (!db) {
      if (goalId && !getFallbackGoal(session.userId, goalId)) {
        return notFound('목표를 찾을 수 없거나 권한이 없습니다.');
      }
      const goals = listFallbackGoals(session.userId);
      context = buildContext(
        [],
        listFallbackDiary(session.userId),
        goalId ? goals.filter((goal) => goal.id === goalId) : goals,
      );
    } else {
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
      context = buildContext(
        careerRecords,
        diaryEntries,
        goalId ? goals.filter((goal) => goal.id === goalId) : goals,
      );
    }

    const assessment = calculateCareerFit(input, context);
    const candidate = normalizeCandidate({
      jobTitle: input.jobTitle,
      companyName: input.companyName,
      requirements: input.requirements,
      skills: input.skills,
      experienceText: input.experience,
      educationText: input.education,
    });
    if (!candidate) return badRequest('직무 입력을 확인해주세요.');

    const match = calculateCareerMatch(candidate, context);
    const reasonCodes = Array.from(new Set([
      ...match.reasonCodes,
      ...careerFitReasonCodes(assessment),
    ]));
    const shouldSave = readSaveFlag(body);
    const rationale = serializeCareerFitRationale(assessment);
    let savedSuggestion: unknown = null;

    if (shouldSave) {
      const data = {
        userId: session.userId,
        goalId,
        jobTitle: input.jobTitle,
        companyName: input.companyName ?? null,
        jobReferenceHash: hashJobReference(candidate),
        matchScore: assessment.recommendationFitScore,
        reasonCodes,
        rationale,
        status: 'saved',
      };

      if (!db) {
        savedSuggestion = responseSuggestion(createFallbackMatch({
          ...data,
          expiresAt: null,
        }), assessment);
      } else {
        const [inserted] = await db.insert(careerMatchSuggestions).values(data).returning();
        if (inserted) savedSuggestion = responseSuggestion(inserted, assessment);
      }
    }

    const payload = {
      ...assessment,
      assessment,
      jobTitle: input.jobTitle,
      companyName: input.companyName ?? null,
      recommendationType: RECOMMENDATION_TYPE,
      disclaimer: CAREER_FIT_DISCLAIMER,
      saved: shouldSave && savedSuggestion !== null,
      savedSuggestion,
    };
    return db ? NextResponse.json(payload) : demoJson(payload);
  } catch (err: unknown) {
    return internalError(err, '지원 적합도 참고지표를 계산하지 못했습니다.');
  }
}
