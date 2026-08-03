import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { interviewMedia, mockInterviews } from '@/db/schema';
import { getSession } from '@/server/getSession';
import {
  deleteInterviewMediaFile,
  getInterviewMediaExpiryDate,
  getInterviewMediaStoragePath,
  isInterviewMediaExpired,
  MAX_INTERVIEW_MEDIA_BYTES,
  normalizeInterviewMediaFileName,
  validateInterviewMedia,
  writeInterviewMediaFile,
} from '@/server/interviewMedia';
import { badRequest, internalError, notFound, payloadTooLarge, unauthorized } from '@/server/http';

type Database = NonNullable<ReturnType<typeof getDb>>;

function serializeMedia(media: typeof interviewMedia.$inferSelect, interviewId: string) {
  return {
    id: media.id,
    interviewId: media.interviewId,
    mediaType: media.mediaType,
    mimeType: media.mimeType,
    originalFileName: media.originalFileName,
    sizeBytes: media.sizeBytes,
    durationMs: media.durationMs,
    analysisStatus: media.analysisStatus,
    createdAt: media.createdAt,
    expiresAt: media.expiresAt,
    url: `/api/interviews/${encodeURIComponent(interviewId)}/media/${encodeURIComponent(media.id)}`,
  };
}

async function findOwnedInterview(db: Database, interviewId: string, userId: string) {
  const [interview] = await db
    .select({ id: mockInterviews.id })
    .from(mockInterviews)
    .where(and(eq(mockInterviews.id, interviewId), eq(mockInterviews.userId, userId)));
  return interview;
}

function parseDurationMs(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 6 * 60 * 60 * 1000) {
    throw new Error('durationMs must be a valid duration');
  }
  return parsed;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.userId) return unauthorized('Unauthorized');

    const db = getDb();
    if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });
    if (!await findOwnedInterview(db, id, session.userId)) return notFound('Not found');

    const records = await db
      .select()
      .from(interviewMedia)
      .where(and(eq(interviewMedia.interviewId, id), eq(interviewMedia.userId, session.userId)))
      .orderBy(desc(interviewMedia.createdAt));

    return NextResponse.json({
      media: records
        .filter((record) => !isInterviewMediaExpired(record.expiresAt))
        .map((record) => serializeMedia(record, id)),
    });
  } catch (err: unknown) {
    return internalError(err, '미디어 목록을 불러오지 못했습니다.');
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.userId) return unauthorized('Unauthorized');

    const db = getDb();
    if (!db) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });
    if (!await findOwnedInterview(db, id, session.userId)) return notFound('Not found');

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return badRequest('업로드할 영상 또는 음성 파일이 없습니다.');
    if (file.size > MAX_INTERVIEW_MEDIA_BYTES) {
      return payloadTooLarge('영상·음성 파일은 100MB 이하만 업로드할 수 있습니다.');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > MAX_INTERVIEW_MEDIA_BYTES) {
      return payloadTooLarge('영상·음성 파일은 100MB 이하만 업로드할 수 있습니다.');
    }

    const validatedMedia = validateInterviewMedia(file.name, file.type, buffer);
    if (!validatedMedia) {
      return NextResponse.json(
        { error: '지원하지 않는 영상·음성 형식이거나 파일 내용과 MIME이 일치하지 않습니다.' },
        { status: 415 }
      );
    }

    let durationMs: number | null;
    try {
      durationMs = parseDurationMs(formData.get('durationMs'));
    } catch {
      return badRequest('녹화 길이 정보가 올바르지 않습니다.');
    }

    const mediaId = crypto.randomUUID();
    const storagePath = getInterviewMediaStoragePath(id, mediaId, validatedMedia.extension);
    const createdAt = new Date();
    const expiresAt = getInterviewMediaExpiryDate(createdAt);
    await writeInterviewMediaFile(storagePath, buffer);

    let record: typeof interviewMedia.$inferSelect | undefined;
    try {
      [record] = await db
        .insert(interviewMedia)
        .values({
          id: mediaId,
          interviewId: id,
          userId: session.userId,
          mediaType: validatedMedia.mediaType,
          mimeType: validatedMedia.contentType,
          originalFileName: normalizeInterviewMediaFileName(file.name),
          storagePath,
          sizeBytes: buffer.byteLength,
          durationMs,
          analysisStatus: 'pending',
          expiresAt,
        })
        .returning();
      if (!record) throw new Error('미디어 metadata 저장 결과가 없습니다.');
    } catch (err: unknown) {
      await deleteInterviewMediaFile(storagePath).catch(() => {});
      throw err;
    }

    return NextResponse.json({ media: serializeMedia(record, id) }, { status: 201 });
  } catch (err: unknown) {
    return internalError(err, '미디어 업로드에 실패했습니다.');
  }
}
