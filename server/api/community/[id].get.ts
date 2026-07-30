import { getDb } from 'db'
import { communityPosts, users } from 'db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '게시글 ID가 필요합니다.' })

  try {
    const db = getDb()
    if (db) {
      const [post] = await db
        .select({
          id: communityPosts.id,
          userId: communityPosts.userId,
          title: communityPosts.title,
          content: communityPosts.content,
          category: communityPosts.category,
          likesCount: communityPosts.likesCount,
          createdAt: communityPosts.createdAt,
          user: {
            name: users.name,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(communityPosts)
        .leftJoin(users, eq(communityPosts.userId, users.id))
        .where(eq(communityPosts.id, id))

      if (post) return post
    }
  } catch {
    console.warn('[Kairos] community/[id].get.ts DB fetch failed (demo mode)')
  }

  throw createError({ statusCode: 404, statusMessage: '게시글을 찾을 수 없습니다.' })
})
