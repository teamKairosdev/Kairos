import { getDb } from 'db'
import { usageRecords, subscriptions } from 'db/schema'
import { eq, and, sql } from 'drizzle-orm'

export interface PlanLimits {
  chat: number
  ats: number
  studio: number
  hwp: number
  price: number // monthly KRW
  label: string
}

export const PLANS: Record<string, PlanLimits> = {
  free: { chat: 50, ats: 10, studio: 5, hwp: 3, price: 0, label: 'Free' },
  pro: { chat: 500, ats: 100, studio: 50, hwp: 30, price: 19900, label: 'Pro' },
  enterprise: { chat: 99999, ats: 99999, studio: 99999, hwp: 99999, price: 99000, label: 'Enterprise' },
}

export async function getCurrentPlan(userId: string) {
  const db = getDb()
  if (!db) return { plan: 'free', limits: PLANS.free }

  const [sub] = await db.select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))

  if (!sub) return { plan: 'free', limits: PLANS.free }
  return { plan: sub.plan, limits: PLANS[sub.plan] || PLANS.free, subscription: sub }
}

export async function getUsage(userId: string, period: string) {
  const db = getDb()
  if (!db) return {}

  const rows = await db.select({
    feature: usageRecords.feature,
    total: sql<number>`sum(${usageRecords.count})`,
  })
    .from(usageRecords)
    .where(and(eq(usageRecords.userId, userId), eq(usageRecords.period, period)))
    .groupBy(usageRecords.feature)

  const usage: Record<string, number> = {}
  for (const row of rows) {
    usage[row.feature] = row.total || 0
  }
  return usage
}

export async function trackUsage(userId: string, feature: string, count = 1) {
  const now = new Date()
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const db = getDb()
  if (!db) return

  // Check limits before tracking
  const { limits } = await getCurrentPlan(userId)
  const usage = await getUsage(userId, period)
  const currentTotal = (usage[feature] || 0) + count

  if (currentTotal > (limits as any)[feature]) {
    return { limited: true, limit: (limits as any)[feature], usage: usage[feature] || 0 }
  }

  await db.insert(usageRecords).values({ userId, feature, count, period })
  return { limited: false }
}
