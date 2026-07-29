import { resolve } from 'path'
import { getDb } from 'db'
import { studioImages } from 'db/schema'
import { eq, and } from 'drizzle-orm'
import { unlink } from 'node:fs/promises'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId
  if (!userId) throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' })

  const id = getRouterParam(event, 'id')

  const db = getDb()
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database unavailable' })

  const [img] = await db.select().from(studioImages).where(
    and(eq(studioImages.id, id), eq(studioImages.userId, userId))
  )
  if (!img) throw createError({ statusCode: 404, statusMessage: '이미지를 찾을 수 없습니다.' })

  // Delete file
  try {
    const filePath = resolve('.' + img.imageUrl)
    await unlink(filePath)
  } catch {}

  await db.delete(studioImages).where(eq(studioImages.id, id))
  return { success: true }
})
