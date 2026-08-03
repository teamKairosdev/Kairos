import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { growthEvents } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, serviceUnavailable, unauthorized } from '@/server/http';

export const DAILY_ECONOMY_NEWS_MISSION = {
  id: 'daily_economy_news',
  title: '매일 경제뉴스 읽기',
} as const;

const checkInSchema = z.object({
  missionId: z.string().trim().optional(),
});

type CheckInEvent = {
  occurredAt: Date | string;
  metadata?: Record<string, unknown> | null;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftUtcDate(key: string, days: number): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

function eventDateKey(event: CheckInEvent): string | null {
  const storedDate = event.metadata?.checkInDate;
  if (typeof storedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(storedDate)) return storedDate;
  const occurredAt = toDate(event.occurredAt);
  return occurredAt ? dateKey(occurredAt) : null;
}

export function calculateMissionCheckInSummary(events: ReadonlyArray<CheckInEvent>, now = new Date()) {
  const completedDates = new Set(
    events
      .map(eventDateKey)
      .filter((date): date is string => date !== null),
  );

  let streakDays = 0;
  const latestDate = [...completedDates].sort().at(-1);
  if (latestDate) {
    const today = dateKey(now);
    const todayStart = new Date(`${today}T00:00:00.000Z`);
    const latest = new Date(`${latestDate}T00:00:00.000Z`);
    const daysSinceLatest = Math.floor((todayStart.getTime() - latest.getTime()) / 86_400_000);
    if (daysSinceLatest <= 1) {
      let cursor = latestDate;
      while (completedDates.has(cursor)) {
        streakDays += 1;
        cursor = shiftUtcDate(cursor, -1);
      }
    }
  }

  return {
    completedCount: completedDates.size,
    streakDays,
  };
}

function missionResponse(summary: ReturnType<typeof calculateMissionCheckInSummary>) {
  return {
    mission: {
      ...DAILY_ECONOMY_NEWS_MISSION,
      verification: 'user_check_in',
    },
    ...summary,
    reward: {
      status: 'pending_policy',
      label: '보상 정책 대기',
    },
  };
}

function privateHeaders(): HeadersInit {
  return {
    'Cache-Control': 'private, no-store',
    Vary: 'Cookie',
  };
}

async function listMissionEvents(db: ReturnType<typeof getDb>, userId: string) {
  if (!db) return [] as CheckInEvent[];
  const events = await db
    .select({ occurredAt: growthEvents.occurredAt, metadata: growthEvents.metadata })
    .from(growthEvents)
    .where(and(eq(growthEvents.userId, userId), eq(growthEvents.eventType, 'mission_check_in')));

  return events.filter(event => event.metadata?.missionId === DAILY_ECONOMY_NEWS_MISSION.id);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const missionId = req.nextUrl.searchParams.get('missionId');
    if (missionId && missionId !== DAILY_ECONOMY_NEWS_MISSION.id) {
      return badRequest('지원하지 않는 미션입니다.');
    }

    const db = getDb();
    if (!db) return serviceUnavailable('미션 체크인 기록을 불러올 수 없습니다.');
    const events = await listMissionEvents(db, session.userId);
    return NextResponse.json(missionResponse(calculateMissionCheckInSummary(events)), { headers: privateHeaders() });
  } catch (error: unknown) {
    return internalError(error, '미션 체크인 기록을 불러오지 못했습니다.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const rawBody = await req.json().catch(() => ({}));
    const parsed = checkInSchema.safeParse(rawBody);
    if (!parsed.success || (parsed.data.missionId && parsed.data.missionId !== DAILY_ECONOMY_NEWS_MISSION.id)) {
      return badRequest('지원하지 않는 미션입니다.');
    }

    const db = getDb();
    if (!db) return serviceUnavailable('미션 체크인 기록을 저장할 수 없습니다.');

    const now = new Date();
    const events = await listMissionEvents(db, session.userId);
    const today = dateKey(now);
    if (events.some(event => eventDateKey(event) === today)) {
      return NextResponse.json({
        recorded: false,
        status: 'already_checked_in',
        ...missionResponse(calculateMissionCheckInSummary(events, now)),
      }, { headers: privateHeaders() });
    }

    const [event] = await db
      .insert(growthEvents)
      .values({
        userId: session.userId,
        roadmapId: null,
        taskId: null,
        eventType: 'mission_check_in',
        title: `${DAILY_ECONOMY_NEWS_MISSION.title} 체크인`,
        description: '외부 뉴스 열람을 검증하지 않는 사용자 체크인 기록입니다.',
        impactScore: null,
        occurredAt: now,
        metadata: {
          source: 'user_check_in',
          missionId: DAILY_ECONOMY_NEWS_MISSION.id,
          checkInDate: today,
        },
      })
      .returning({ occurredAt: growthEvents.occurredAt, metadata: growthEvents.metadata });

    if (!event) return internalError(new Error('empty insert result'), '미션 체크인 기록을 저장하지 못했습니다.');
    return NextResponse.json({
      recorded: true,
      ...missionResponse(calculateMissionCheckInSummary([...events, event], now)),
    }, { status: 201, headers: privateHeaders() });
  } catch (error: unknown) {
    return internalError(error, '미션 체크인 기록을 저장하지 못했습니다.');
  }
}
