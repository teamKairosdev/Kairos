import { NextRequest, NextResponse } from 'next/server';
import { resolve, join } from 'path';
import { getDb } from '@/db';
import { getSession } from '@/server/getSession';
import { unauthorized, notFound, internalError } from '@/server/http';

const STUDIO_DIR = resolve('uploads/studio');

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
    const db = getDb();
    if (!db) {
      return NextResponse.json({ success: true });
    }

    const { studioImages: si } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');

    const [existing] = await db.select().from(si).where(eq(si.id, id)).limit(1);
    if (!existing || existing.userId !== session.userId) {
      return notFound('이미지를 찾을 수 없습니다.');
    }

    await db.delete(si).where(eq(si.id, id));

    if (existing.imageUrl?.startsWith('/uploads/studio/')) {
      const { unlink } = await import('node:fs/promises');
      const filename = existing.imageUrl.split('/').pop();
      if (filename) {
        await unlink(join(STUDIO_DIR, filename)).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}
