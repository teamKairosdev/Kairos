import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import { getDb } from '@/db';
import { interviewMedia, memoryExportJobs, studioImages, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { badRequest, internalError, serviceUnavailable, unauthorized } from '@/server/http';
import { deleteInterviewMediaFile } from '@/server/interviewMedia';
import { deleteOwnedDocuments } from '@/server/documentStore';
import { basename, resolve } from 'node:path';
import { unlink } from 'node:fs/promises';
import { deleteMemoryExport } from '@/server/contexts';

const STUDIO_DIR = resolve(process.cwd(), 'uploads', 'studio');

async function deleteUserFiles(
  db: NonNullable<ReturnType<typeof getDb>>,
  userId: string,
): Promise<void> {
  const [mediaRows, imageRows, exportRows] = await Promise.all([
    db.select({ storagePath: interviewMedia.storagePath }).from(interviewMedia).where(eq(interviewMedia.userId, userId)),
    db.select({ imageUrl: studioImages.imageUrl }).from(studioImages).where(eq(studioImages.userId, userId)),
    db.select({ outputRef: memoryExportJobs.outputRef }).from(memoryExportJobs).where(eq(memoryExportJobs.userId, userId)),
  ]);

  deleteOwnedDocuments(userId);
  await Promise.all(mediaRows.map((row) => deleteInterviewMediaFile(row.storagePath)));
  await Promise.all(imageRows.map(async (row) => {
    if (!row.imageUrl.startsWith('/uploads/studio/')) return;
    const fileName = basename(row.imageUrl);
    if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) return;
    await unlink(resolve(STUDIO_DIR, fileName)).catch((error: unknown) => {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return;
      throw error;
    });
  }));
  exportRows.forEach((row) => {
    if (row.outputRef) deleteMemoryExport(row.outputRef);
  });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ user: null });

    const db = getDb();
    if (!db) return serviceUnavailable('사용자 계정을 확인할 수 없습니다.');
    const [user] = await db.select().from(users).where(eq(users.id, session.userId));
    if (!user) {
      const response = NextResponse.json({ user: null });
      response.cookies.delete('kairos_session');
      return response;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        walletAddress: user.walletAddress,
      },
    });
  } catch (err: unknown) {
    return internalError(err, '사용자 정보를 확인하지 못했습니다.');
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return unauthorized('Unauthorized');
  }

  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return badRequest('프로필 정보 형식이 올바르지 않습니다.');
    }
    const db = getDb();
    if (!db) {
      return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    }

    const updateData: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (body.walletAddress !== undefined) {
      return badRequest('지갑 주소는 지갑 연결 절차로만 변경할 수 있습니다.');
    }
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 255) {
        return badRequest('이름은 1자 이상 255자 이하로 입력해주세요.');
      }
      updateData.name = body.name.trim();
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.userId))
      .returning();

    return NextResponse.json({ user: updated });
  } catch (err: unknown) {
    return internalError(err, '프로필 업데이트 중 오류가 발생했습니다.');
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return unauthorized('Unauthorized');
  }

  try {
    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    await deleteUserFiles(db, session.userId);
    await db.delete(users).where(eq(users.id, session.userId));

    const res = NextResponse.json({ success: true });
    res.cookies.delete('kairos_session');
    return res;
  } catch (err: unknown) {
    return internalError(err, '계정 삭제 중 오류가 발생했습니다.');
  }
}
