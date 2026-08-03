import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { communityPosts, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/server/getSession';
import { unauthorized, badRequest, notFound, internalError } from '@/server/http';
import { toPublicCommunityPost } from '../response';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return badRequest('게시글 ID가 필요합니다.');
    const session = await getSession(_req);

    const db = getDb();
    if (db) {
      const [post] = await db
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
        .where(eq(communityPosts.id, id));

      if (post) return NextResponse.json(toPublicCommunityPost(post, session?.userId));
    }

    return notFound('게시글을 찾을 수 없습니다.');
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return unauthorized();
    }

    const { id } = await params;
    if (!id) return badRequest('게시글 ID가 필요합니다.');

    const db = getDb();
    if (db) {
      const [post] = await db
        .select({ userId: communityPosts.userId })
        .from(communityPosts)
        .where(eq(communityPosts.id, id));

      if (!post) return notFound('게시글을 찾을 수 없습니다.');
      if (post.userId !== session.userId) {
        return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
      }

      await db.delete(communityPosts).where(eq(communityPosts.id, id));
      return NextResponse.json({ success: true, message: '게시글이 삭제되었습니다.' });
    }

    return NextResponse.json({ success: true, message: '게시글이 삭제되었습니다.' });
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}
