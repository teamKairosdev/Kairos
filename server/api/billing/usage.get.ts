import { getCurrentPlan, getUsage } from 'server/services/billing'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId
  if (!userId) throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' })

  const now = new Date()
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { plan, limits, subscription } = await getCurrentPlan(userId)
  const usage = await getUsage(userId, period)

  return { plan, limits, usage, period, subscription }
})
