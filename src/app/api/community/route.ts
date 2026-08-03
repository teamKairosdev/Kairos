import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { communityPosts, users } from '@/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import { getSession } from '@/server/getSession';
import { unauthorized, badRequest, internalError, serviceUnavailable } from '@/server/http';
import { toPublicCommunityPost } from './response';

const VALID_CATEGORIES = ['interview_pass', 'career_tip', 'qna'] as const;

export async function GET(req: NextRequest) {
  const rawPage = Number.parseInt(req.nextUrl.searchParams.get('page') || '1', 10);
  const rawLimit = Number.parseInt(req.nextUrl.searchParams.get('limit') || '20', 10);
  const page = Number.isSafeInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit = Number.isSafeInteger(rawLimit) ? Math.min(50, Math.max(1, rawLimit)) : 20;

  try {
    const session = await getSession(req);
    const category = req.nextUrl.searchParams.get('category') || undefined;
    if (category && !VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
      return badRequest('올바른 카테고리를 선택해주세요.');
    }
    const offset = (page - 1) * limit;

    const db = getDb();
    if (db) {
      const filters = [];
      if (category) filters.push(eq(communityPosts.category, category));

      const posts = await db
        .select({
          id: communityPosts.id,
          userId: communityPosts.userId,
          title: communityPosts.title,
          content: communityPosts.content,
          category: communityPosts.category,
          isAnonymous: communityPosts.isAnonymous,
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
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(communityPosts)
        .where(category ? eq(communityPosts.category, category) : sql`1=1`);
      const total = Number(countResult[0]?.count ?? 0);

      return NextResponse.json({
        posts: posts.map(post => toPublicCommunityPost(post, session?.userId)),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
  } catch (error: unknown) {
    return internalError(error, '커뮤니티 게시글을 불러오지 못했습니다.');
  }

  return serviceUnavailable('커뮤니티 저장소를 사용할 수 없습니다.');
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return unauthorized();
    }

    const body = await req.json();
    const { title, content, category, isAnonymous } = body || {};

    if (typeof title !== 'string' || typeof content !== 'string' || !title.trim() || !content.trim()) {
      return badRequest('제목과 내용을 입력해주세요.');
    }
    if (title.trim().length > 255 || content.trim().length > 20_000) {
      return badRequest('제목 또는 내용이 허용된 길이를 초과했습니다.');
    }
    if (isAnonymous !== undefined && typeof isAnonymous !== 'boolean') {
      return badRequest('익명 표시 설정이 올바르지 않습니다.');
    }

    const finalCategory = category || 'career_tip';
    if (!VALID_CATEGORIES.includes(finalCategory)) {
      return badRequest('올바른 카테고리를 선택해주세요.');
    }

    const db = getDb();
    if (db) {
      const [post] = await db
        .insert(communityPosts)
        .values({
          userId: session.userId,
          title: title.trim(),
          content: content.trim(),
          category: finalCategory,
          isAnonymous: isAnonymous === true,
        })
        .returning();
      return NextResponse.json(toPublicCommunityPost({ ...post, user: null }, session.userId));
    }

    return serviceUnavailable('커뮤니티 저장소를 사용할 수 없습니다.');
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}
