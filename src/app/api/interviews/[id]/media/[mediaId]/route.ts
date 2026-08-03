import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { interviewMedia, mockInterviews } from '@/db/schema';
import { getSession } from '@/server/getSession';
import {
  deleteInterviewMediaFile,
  isInterviewMediaExpired,
  readInterviewMediaFile,
} from '@/server/interviewMedia';
import { internalError, notFound, unauthorized } from '@/server/http';

type Database = NonNullable<ReturnType<typeof getDb>>;

async function findOwnedInterview(db: Database, interviewId: string, userId: string) {
  const [interview] = await db
    .select({ id: mockInterviews.id })
    .from(mockInterviews)
    .where(and(eq(mockInterviews.id, interviewId), eq(mockInterviews.userId, userId)));
  return interview;
}

async function findOwnedMedia(
  db: Database,
  interviewId: string,
  mediaId: string,
  userId: string
) {
  const [media] = await db
    .select()
    .from(interviewMedia)
    .where(
      and(
        eq(interviewMedia.id, mediaId),
        eq(interviewMedia.interviewId, interviewId),
        eq(interviewMedia.userId, userId)
      )
    );
  return media;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  try {
    const { id, mediaId } = await params;
    const session = await getSession(req);
    if (!session?.userId) return unauthorized('Unauthorized');

    const db = getDb();
    if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });
    if (!await findOwnedInterview(db, id, session.userId)) return notFound('Not found');

    const media = await findOwnedMedia(db, id, mediaId, session.userId);
    if (!media || isInterviewMediaExpired(media.expiresAt)) {
      return notFound('미디어를 찾을 수 없습니다.');
    }

    let data: Buffer;
    try {
      data = await readInterviewMediaFile(media.storagePath);
    } catch {
      return notFound('미디어 파일을 찾을 수 없습니다.');
    }

    const fileName = media.originalFileName.replace(/[\r\n"]/g, '_') || 'interview-media';
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': media.mimeType,
        'Content-Length': String(data.byteLength),
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: unknown) {
    return internalError(err, '미디어를 재생할 수 없습니다.');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  try {
    const { id, mediaId } = await params;
    const session = await getSession(req);
    if (!session?.userId) return unauthorized('Unauthorized');

    const db = getDb();
    if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });
    if (!await findOwnedInterview(db, id, session.userId)) return notFound('Not found');

    const media = await findOwnedMedia(db, id, mediaId, session.userId);
    if (!media) return notFound('미디어를 찾을 수 없습니다.');

    const deleted = await db
      .delete(interviewMedia)
      .where(
        and(
          eq(interviewMedia.id, mediaId),
          eq(interviewMedia.interviewId, id),
          eq(interviewMedia.userId, session.userId)
        )
      )
      .returning({ id: interviewMedia.id });

    if (!deleted.length) return notFound('미디어를 찾을 수 없습니다.');
    // Remove the private file after the ownership-scoped metadata delete. A
    // cleanup failure leaves no database pointer to an inaccessible file.
    await deleteInterviewMediaFile(media.storagePath).catch((error: unknown) => {
      console.warn('[Kairos] interview media file cleanup failed:', error instanceof Error ? error.message : error);
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return internalError(err, '미디어 삭제에 실패했습니다.');
  }
}
