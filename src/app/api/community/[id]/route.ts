import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { communityPosts, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/server/getSession';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) return NextResponse.json({ error: '게시글 ID가 필요합니다.' }, { status: 400 });

    const db = getDb();
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
        .where(eq(communityPosts.id, id));

      if (post) return NextResponse.json(post);
    }

    return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id } = params;
    if (!id) return NextResponse.json({ error: '게시글 ID가 필요합니다.' }, { status: 400 });

    const db = getDb();
    if (db) {
      const [post] = await db
        .select({ userId: communityPosts.userId })
        .from(communityPosts)
        .where(eq(communityPosts.id, id));

      if (!post) return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });
      if (post.userId !== session.userId) {
        return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
      }

      await db.delete(communityPosts).where(eq(communityPosts.id, id));
      return NextResponse.json({ success: true, message: '게시글이 삭제되었습니다.' });
    }

    return NextResponse.json({ success: true, message: '게시글이 삭제되었습니다.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}
