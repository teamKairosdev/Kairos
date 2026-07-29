import { getDb } from 'db'
import { studioImages } from 'db/schema'
import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId
  if (!userId) throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' })

  const db = getDb()
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database unavailable' })

  const images = await db.select()
    .from(studioImages)
    .where(eq(studioImages.userId, userId))
    .orderBy(desc(studioImages.createdAt))
    .limit(50)

  return { images }
})
