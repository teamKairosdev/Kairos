import { subscribeUser } from 'server/services/push'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' })
  }

  const body = await readBody(event)
  const { endpoint, keys } = body || {}

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw createError({ statusCode: 400, statusMessage: '올바른 구독 정보가 아닙니다.' })
  }

  const sub = await subscribeUser(userId, { endpoint, keys })
  if (!sub) {
    throw createError({ statusCode: 500, statusMessage: '구독 저장에 실패했습니다.' })
  }

  return { success: true, message: '푸시 알림이 활성화되었습니다.' }
})
