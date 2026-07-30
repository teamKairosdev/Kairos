import { getDb } from 'db'
import { subscriptions } from 'db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { orderId, paymentKey, amount, plan } = await readBody(event)
  if (!orderId || !paymentKey || !amount) {
    throw createError({ statusCode: 400, statusMessage: 'Missing payment parameters' })
  }

  const userId = event.context.user?.userId
  if (!userId) throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' })

  const secretKey = useRuntimeConfig().tossSecretKey
  if (!secretKey) throw createError({ statusCode: 500, statusMessage: 'Toss payments not configured' })

  const tossApiUrl = (useRuntimeConfig() as Record<string, string>).tossApiUrl
  const response = await fetch(`${tossApiUrl}/payments/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ orderId, paymentKey, amount }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw createError({ statusCode: 400, statusMessage: err.message || 'Payment verification failed' })
  }

  const data = await response.json()

  // Create/update subscription
  const db = getDb()
  if (db) {
    await db.insert(subscriptions).values({
      userId,
      plan: plan || 'pro',
      status: 'active',
      tossPaymentKey: data.paymentKey,
      tossOrderId: data.orderId,
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }).onConflictDoUpdate({
      target: subscriptions.userId,
      set: { plan: plan || 'pro', status: 'active', tossPaymentKey: data.paymentKey, tossOrderId: data.orderId, updatedAt: new Date() },
    })
  }

  return {
    status: 'completed',
    plan: plan || 'pro',
    paymentKey: data.paymentKey,
    orderId: data.orderId,
    amount: data.totalAmount,
    method: data.method,
  }
})
