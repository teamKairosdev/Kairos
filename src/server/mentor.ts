import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { getDb } from '@/db';
import { growthEvents, mentorRoadmaps, mentorTasks } from '@/db/schema';
import { type KairosDb } from '@/server/preparation';

export const ROADMAP_STATUSES = ['active', 'completed', 'archived'] as const;
export const TASK_STATUSES = ['todo', 'in_progress', 'completed'] as const;

type MentorTask = typeof mentorTasks.$inferSelect;

export interface MentorMetrics {
  totalTaskCount: number;
  completedTaskCount: number;
  completionRate: number;
  streakDays: number;
}

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

export function calculateMentorMetrics(
  tasks: Array<Pick<MentorTask, 'status' | 'completedAt' | 'updatedAt'>>,
  now = new Date(),
): MentorMetrics {
  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const completedDates = new Set(
    completedTasks
      .map((task) => toDate(task.completedAt) ?? toDate(task.updatedAt))
      .filter((date): date is Date => date !== null)
      .map(dateKey),
  );

  let streakDays = 0;
  const today = dateKey(now);
  const latestDate = [...completedDates].sort().at(-1);
  if (latestDate) {
    const latest = new Date(`${latestDate}T00:00:00.000Z`);
    const todayStart = new Date(`${today}T00:00:00.000Z`);
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
    totalTaskCount: tasks.length,
    completedTaskCount: completedTasks.length,
    completionRate: tasks.length === 0 ? 0 : Math.round((completedTasks.length / tasks.length) * 100),
    streakDays,
  };
}

export async function findOwnedMentorRoadmap(
  db: KairosDb,
  roadmapId: string,
  userId: string,
) {
  const [roadmap] = await db
    .select()
    .from(mentorRoadmaps)
    .where(and(eq(mentorRoadmaps.id, roadmapId), eq(mentorRoadmaps.userId, userId)));
  return roadmap;
}

export async function findOwnedMentorTask(
  db: KairosDb,
  taskId: string,
  userId: string,
) {
  const [task] = await db
    .select()
    .from(mentorTasks)
    .where(and(eq(mentorTasks.id, taskId), eq(mentorTasks.userId, userId)));
  if (!task) return undefined;

  const roadmap = await findOwnedMentorRoadmap(db, task.roadmapId, userId);
  if (!roadmap) return undefined;
  return { task, roadmap };
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

const THREE_MONTH_TASKS = [
  ['1개월차', '목표 직무와 채용 공고 5개를 비교해 핵심 역량을 정리하세요.', '목표 직무의 요구 역량을 표로 정리'],
  ['1개월차', '경험과 성과를 STAR 형식으로 3개 작성하세요.', '경험의 상황, 행동, 결과를 구조화'],
  ['1개월차', '이력서 초안을 작성하고 한 번 검토하세요.', '목표 직무에 맞춘 이력서 초안 저장'],
  ['1개월차', '포트폴리오 또는 프로젝트 설명을 한 페이지로 정리하세요.', '대표 프로젝트의 문제와 결과 정리'],
  ['2개월차', '자기소개와 지원 동기 답변을 작성하세요.', '1분 자기소개와 지원 동기 초안 작성'],
  ['2개월차', '직무 면접 예상 질문 10개에 답변하세요.', '기술 또는 직무 질문 답변 연습'],
  ['2개월차', '모의 면접을 한 번 진행하고 피드백을 기록하세요.', '모의 면접 결과에서 개선점 기록'],
  ['2개월차', '이력서와 포트폴리오를 피드백 기준으로 수정하세요.', '피드백을 반영한 지원 서류 업데이트'],
  ['3개월차', '지원할 기업 5곳의 기준과 일정을 정리하세요.', '지원 우선순위와 마감일 기록'],
  ['3개월차', '첫 지원 서류를 제출하고 제출 내용을 기록하세요.', '지원 기업과 제출 버전 저장'],
  ['3개월차', '네트워킹 또는 현업 정보 인터뷰를 한 번 시도하세요.', '현업 대화에서 얻은 인사이트 기록'],
  ['3개월차', '이번 달 결과를 회고하고 다음 행동을 정하세요.', '지원 결과와 다음 주 행동 계획 작성'],
] as const;

export interface ThreeMonthRoadmapOptions {
  title?: string;
  objective?: string;
  startDate?: Date;
  targetDate?: Date;
}

export async function createThreeMonthRoadmap(
  db: KairosDb,
  userId: string,
  options: ThreeMonthRoadmapOptions = {},
) {
  const startDate = options.startDate ?? new Date();
  const targetDate = options.targetDate ?? addMonths(startDate, 3);
  const [roadmap] = await db
    .insert(mentorRoadmaps)
    .values({
      userId,
      title: options.title?.trim() || '취업준비생 3개월 로드맵',
      objective: options.objective?.trim() || '목표 직무를 정하고 지원 서류와 면접 준비를 3개월 동안 꾸준히 진행합니다.',
      status: 'active',
      source: 'template',
      targetDate,
      metadata: { template: 'three_month', audience: 'job_seeker' },
    })
    .returning();

  if (!roadmap) throw new Error('로드맵을 생성하지 못했습니다.');

  try {
    const tasks = await db
      .insert(mentorTasks)
      .values(
        THREE_MONTH_TASKS.map(([month, title, description], index) => ({
          roadmapId: roadmap.id,
          userId,
          title,
          description,
          status: 'todo' as const,
          priority: index < 4 ? 3 : index < 8 ? 2 : 1,
          sortOrder: index,
          dueDate: addDays(startDate, (index + 1) * 7),
          metadata: { template: 'three_month', month },
        })),
      )
      .returning();

    return { roadmap, tasks };
  } catch (error) {
    await db
      .delete(mentorRoadmaps)
      .where(and(eq(mentorRoadmaps.id, roadmap.id), eq(mentorRoadmaps.userId, userId)))
      .catch(() => undefined);
    throw error;
  }
}

export async function recordMentorTaskCompletion(
  db: KairosDb,
  userId: string,
  task: MentorTask,
  completedAt: Date,
) {
  const [event] = await db
    .insert(growthEvents)
    .values({
      userId,
      roadmapId: task.roadmapId,
      taskId: task.id,
      eventType: 'task_completed',
      title: `${task.title} 완료`,
      description: '멘토 로드맵 과제를 완료했습니다.',
      impactScore: 1,
      occurredAt: completedAt,
      metadata: { source: 'mentor_task', completedAt: completedAt.toISOString() },
    })
    .returning();
  return event;
}

export async function completeOwnedMentorTask(
  db: KairosDb,
  userId: string,
  taskId: string,
) {
  const owned = await findOwnedMentorTask(db, taskId, userId);
  if (!owned) return undefined;
  if (owned.task.status === 'completed') {
    return { task: owned.task, event: undefined };
  }

  const completedAt = new Date();
  const [updated] = await db
    .update(mentorTasks)
    .set({ status: 'completed', completedAt, updatedAt: completedAt })
    .where(
      and(
        eq(mentorTasks.id, taskId),
        eq(mentorTasks.userId, userId),
        ne(mentorTasks.status, 'completed'),
      ),
    )
    .returning();

  if (!updated) {
    const latest = await findOwnedMentorTask(db, taskId, userId);
    return latest ? { task: latest.task, event: undefined } : undefined;
  }

  const event = await recordMentorTaskCompletion(db, userId, updated, completedAt);
  return { task: updated, event };
}

export async function listOwnedMentorTasks(db: KairosDb, userId: string, roadmapId?: string) {
  if (roadmapId) {
    const roadmap = await findOwnedMentorRoadmap(db, roadmapId, userId);
    if (!roadmap) return { roadmap: undefined, tasks: [] as MentorTask[] };
  }

  const tasks = await db
    .select()
    .from(mentorTasks)
    .where(
      roadmapId
        ? and(eq(mentorTasks.userId, userId), eq(mentorTasks.roadmapId, roadmapId))
        : eq(mentorTasks.userId, userId),
    )
    .orderBy(asc(mentorTasks.sortOrder), desc(mentorTasks.createdAt));

  return { tasks };
}
