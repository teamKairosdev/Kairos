import { getDb } from 'db'
import { communityPosts } from 'db/schema'

const VALID_CATEGORIES = ['interview_pass', 'career_tip', 'qna'] as const

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' })
  }

  const body = await readBody(event)
  const { title, content, category } = body || {}

  if (!title || !content) {
    throw createError({ statusCode: 400, statusMessage: '제목과 내용을 입력해주세요.' })
  }

  const finalCategory = category || 'career_tip'
  if (!VALID_CATEGORIES.includes(finalCategory)) {
    throw createError({ statusCode: 400, statusMessage: '올바른 카테고리를 선택해주세요.' })
  }

  try {
    const db = getDb()
    if (db) {
      const [post] = await db
        .insert(communityPosts)
        .values({ userId, title, content, category: finalCategory })
        .returning()
      return post
    }
  } catch {
    console.warn('[Kairos] community/index.post.ts DB save failed (demo mode)')
  }

  return {
    id: 'demo-post-' + Date.now(),
    userId,
    title,
    content,
    category: finalCategory,
    likesCount: 0,
    createdAt: new Date().toISOString(),
  }
})
