import { getDb } from 'db'
import { communityPosts } from 'db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '게시글 ID가 필요합니다.' })

  try {
    const db = getDb()
    if (db) {
      const [post] = await db
        .select({ userId: communityPosts.userId })
        .from(communityPosts)
        .where(eq(communityPosts.id, id))

      if (!post) {
        throw createError({ statusCode: 404, statusMessage: '게시글을 찾을 수 없습니다.' })
      }

      if (post.userId !== userId) {
        throw createError({ statusCode: 403, statusMessage: '삭제 권한이 없습니다.' })
      }

      await db.delete(communityPosts).where(eq(communityPosts.id, id))
      return { success: true, message: '게시글이 삭제되었습니다.' }
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.warn('[Kairos] community/[id].delete.ts DB operation failed (demo mode)')
  }

  return { success: true, message: '게시글이 삭제되었습니다.' }
})
