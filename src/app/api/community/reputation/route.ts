import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { communityPosts, growthEvents } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';

export const COMMUNITY_REPUTATION_POINTS = {
  answer: 3,
  feedback: 2,
} as const;

const REPUTATION_EVENT_TYPES = ['community_answer', 'community_feedback'] as const;
const activitySchema = z.object({
  activityType: z.enum(['answer', 'feedback']),
  postId: z.string().trim().min(1).max(100),
});

type ReputationEvent = {
  id?: string;
  eventType: string;
  metadata?: Record<string, unknown> | null;
};

export function calculateCommunityReputation(events: ReadonlyArray<ReputationEvent>) {
  const answerCount = events.filter(event => event.eventType === 'community_answer').length;
  const feedbackCount = events.filter(event => event.eventType === 'community_feedback').length;
  const reputationPoints =
    answerCount * COMMUNITY_REPUTATION_POINTS.answer + feedbackCount * COMMUNITY_REPUTATION_POINTS.feedback;

  return {
    reputationPoints,
    points: reputationPoints,
    answerCount,
    feedbackCount,
  };
}

function response(reputation: ReturnType<typeof calculateCommunityReputation>) {
  return {
    ...reputation,
    visibility: 'private',
    policy: {
      meaning: '커뮤니티 답변과 피드백 활동을 기록한 내부 활동 점수입니다.',
      notEmploymentOutcome: true,
      notSkillRating: true,
      rewardStatus: 'pending_policy',
    },
  };
}

function isSamePostActivity(event: ReputationEvent, postId: string) {
  return event.metadata?.source === 'community_reputation' && event.metadata.targetPostId === postId;
}

async function listReputationEvents(db: ReturnType<typeof getDb>, userId: string) {
  if (!db) return [] as ReputationEvent[];
  return db
    .select({
      id: growthEvents.id,
      eventType: growthEvents.eventType,
      metadata: growthEvents.metadata,
    })
    .from(growthEvents)
    .where(and(eq(growthEvents.userId, userId), inArray(growthEvents.eventType, [...REPUTATION_EVENT_TYPES])));
}

function privateHeaders(): HeadersInit {
  return {
    'Cache-Control': 'private, no-store',
    Vary: 'Cookie',
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const db = getDb();
    if (!db) return serviceUnavailable('커뮤니티 활동 점수를 불러올 수 없습니다.');

    const events = await listReputationEvents(db, session.userId);
    return NextResponse.json(response(calculateCommunityReputation(events)), { headers: privateHeaders() });
  } catch (error: unknown) {
    return internalError(error, '커뮤니티 활동 점수를 불러오지 못했습니다.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const rawBody = await req.json().catch(() => null);
    const parsed = activitySchema.safeParse(rawBody);
    if (!parsed.success) return badRequest('답변 또는 피드백 활동 정보가 올바르지 않습니다.');

    const db = getDb();
    if (!db) return serviceUnavailable('커뮤니티 활동 점수를 저장할 수 없습니다.');

    const [post] = await db
      .select({ id: communityPosts.id })
      .from(communityPosts)
      .where(eq(communityPosts.id, parsed.data.postId));
    if (!post) return notFound('대상 게시글을 찾을 수 없습니다.');

    const events = await listReputationEvents(db, session.userId);
    const eventType = `community_${parsed.data.activityType}`;
    if (events.some(event => event.eventType === eventType && isSamePostActivity(event, parsed.data.postId))) {
      return NextResponse.json({
        recorded: false,
        activityType: parsed.data.activityType,
        reputation: response(calculateCommunityReputation(events)),
      }, { headers: privateHeaders() });
    }

    const [event] = await db
      .insert(growthEvents)
      .values({
        userId: session.userId,
        roadmapId: null,
        taskId: null,
        eventType,
        title: parsed.data.activityType === 'answer' ? '커뮤니티 답변 활동' : '커뮤니티 피드백 활동',
        description: '커뮤니티 활동 기록입니다.',
        impactScore: COMMUNITY_REPUTATION_POINTS[parsed.data.activityType],
        metadata: {
          source: 'community_reputation',
          targetPostId: parsed.data.postId,
        },
      })
      .returning({ id: growthEvents.id, eventType: growthEvents.eventType, metadata: growthEvents.metadata });

    if (!event) return internalError(new Error('empty insert result'), '커뮤니티 활동 점수를 저장하지 못했습니다.');
    const reputation = calculateCommunityReputation([...events, event]);
    return NextResponse.json({
      recorded: true,
      activityType: parsed.data.activityType,
      reputation: response(reputation),
    }, { status: 201, headers: privateHeaders() });
  } catch (error: unknown) {
    return internalError(error, '커뮤니티 활동 점수를 저장하지 못했습니다.');
  }
}
