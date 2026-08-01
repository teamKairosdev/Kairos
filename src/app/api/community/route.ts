import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { communityPosts, users } from '@/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import { getSession } from '@/server/getSession';

const VALID_CATEGORIES = ['interview_pass', 'career_tip', 'qna'] as const;

export async function GET(req: NextRequest) {
  try {
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '20')));
    const category = req.nextUrl.searchParams.get('category') || undefined;
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
        .from(communityPosts);
      const total = Number(countResult[0]?.count ?? 0);

      return NextResponse.json({
        posts,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
  } catch {
    console.warn('[Kairos] community GET DB fetch failed (demo mode)');
  }

  return NextResponse.json({ posts: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await req.json();
    const { title, content, category } = body || {};

    if (!title || !content) {
      return NextResponse.json({ error: '제목과 내용을 입력해주세요.' }, { status: 400 });
    }

    const finalCategory = category || 'career_tip';
    if (!VALID_CATEGORIES.includes(finalCategory)) {
      return NextResponse.json({ error: '올바른 카테고리를 선택해주세요.' }, { status: 400 });
    }

    const db = getDb();
    if (db) {
      const [post] = await db
        .insert(communityPosts)
        .values({ userId: session.userId, title, content, category: finalCategory })
        .returning();
      return NextResponse.json(post);
    }

    return NextResponse.json({
      id: 'demo-post-' + Date.now(),
      userId: session.userId,
      title,
      content,
      category: finalCategory,
      likesCount: 0,
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}
