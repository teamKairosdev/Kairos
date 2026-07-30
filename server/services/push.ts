import { getDb } from 'db'
import { pushSubscriptions } from 'db/schema'
import { eq } from 'drizzle-orm'
import webPush from 'web-push'

export interface PushPayload {
  title: string
  body: string
  data?: Record<string, unknown>
}

export function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@kairos.app'

  if (!publicKey || !privateKey) {
    return null
  }

  return { publicKey, privateKey, subject }
}

export function ensureVapidConfigured() {
  const config = getVapidConfig()
  if (!config) {
    throw createError({ statusCode: 500, statusMessage: 'VAPID keys not configured' })
  }
  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey)
}

export async function subscribeUser(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const db = getDb()
  if (!db) return null

  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, subscription.endpoint))

  if (existing.length > 0) return existing[0]

  const [sub] = await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })
    .returning()

  return sub
}

export async function getUserSubscriptions(userId: string) {
  const db = getDb()
  if (!db) return []
  return await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  ensureVapidConfigured()
  const subs = await getUserSubscriptions(userId)
  const results: { success: boolean; endpoint: string }[] = []

  for (const sub of subs) {
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      )
      results.push({ success: true, endpoint: sub.endpoint })
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        const db = getDb()
        if (db) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id))
        }
      }
      results.push({ success: false, endpoint: sub.endpoint })
    }
  }

  return results
}

export async function broadcastPush(payload: PushPayload) {
  ensureVapidConfigured()
  const db = getDb()
  if (!db) return []
  const allSubs = await db.select().from(pushSubscriptions)
  const results: { success: boolean; endpoint: string }[] = []

  for (const sub of allSubs) {
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      )
      results.push({ success: true, endpoint: sub.endpoint })
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id))
      }
      results.push({ success: false, endpoint: sub.endpoint })
    }
  }

  return results
}
