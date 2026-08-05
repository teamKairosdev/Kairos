import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { communityPosts, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/server/getSession';
import { unauthorized, badRequest, notFound, internalError, serviceUnavailable } from '@/server/http';
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

    return serviceUnavailable('커뮤니티 저장소를 사용할 수 없습니다.');
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const { id } = await params;
    if (!id) return badRequest('게시글 ID가 필요합니다.');
    const body = await req.json().catch(() => null) as {
      title?: unknown;
      content?: unknown;
      category?: unknown;
      isAnonymous?: unknown;
    } | null;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return badRequest('요청 본문이 올바르지 않습니다.');

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const category = body.category;
    if (!title || title.length > 50) return badRequest('제목은 1자 이상 50자 이하로 입력해주세요.');
    if (!content || content.length > 1_000) return badRequest('내용은 1자 이상 1,000자 이하로 입력해주세요.');
    if (category !== 'interview_pass' && category !== 'career_tip' && category !== 'qna') return badRequest('지원하지 않는 카테고리입니다.');
    if (typeof body.isAnonymous !== 'boolean') return badRequest('익명 여부가 올바르지 않습니다.');

    const db = getDb();
    if (!db) return serviceUnavailable('커뮤니티 저장소를 사용할 수 없습니다.');
    const [post] = await db
      .select({ userId: communityPosts.userId })
      .from(communityPosts)
      .where(eq(communityPosts.id, id));
    if (!post) return notFound('게시글을 찾을 수 없습니다.');
    if (post.userId !== session.userId) return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });

    const updated = await db
      .update(communityPosts)
      .set({ title, content, category, isAnonymous: body.isAnonymous })
      .where(and(eq(communityPosts.id, id), eq(communityPosts.userId, session.userId)))
      .returning({ id: communityPosts.id, userId: communityPosts.userId });

    if (!updated[0]) return notFound('게시글을 찾을 수 없습니다.');
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    return internalError(err, '게시글을 수정하지 못했습니다.');
  }
}
