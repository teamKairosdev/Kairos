import { getDb } from 'db'
import { communityPosts, users } from 'db/schema'
import { desc, eq, and, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, parseInt(query.page as string) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(query.limit as string) || 20))
  const category = query.category as string | undefined
  const offset = (page - 1) * limit

  try {
    const db = getDb()
    if (db) {
      const filters = []
      if (category) {
        filters.push(eq(communityPosts.category, category))
      }

      const posts = await db
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
        .where(filters.length > 0 ? and(...filters) : sql`1=1`)
        .orderBy(desc(communityPosts.createdAt))
        .limit(limit)
        .offset(offset)

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(communityPosts)
      const total = Number(countResult[0]?.count ?? 0)

      return {
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    }
  } catch {
    console.warn('[Kairos] community/index.get.ts DB fetch failed (demo mode)')
  }

  return { posts: [], pagination: { page, limit, total: 0, totalPages: 0 } }
})
