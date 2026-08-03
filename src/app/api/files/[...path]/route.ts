import { NextRequest } from 'next/server';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';
import { readFile } from 'node:fs/promises';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { studioImages } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { badRequest, notFound, internalError, serviceUnavailable, unauthorized } from '@/server/http';
import {
  getDocumentAccessByFileName,
  LEGACY_DOCUMENT_MESSAGE,
  readDocumentMeta,
} from '@/server/documentStore';

const UPLOADS_ROOT = resolve(process.cwd(), 'uploads');

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getSession(_req);
    if (!session?.userId) return unauthorized();

    const { path } = await params;
    if (!path?.length) return badRequest('파일 경로가 필요합니다.');

    const filePath = resolve(UPLOADS_ROOT, ...path);
    const relativePath = relative(UPLOADS_ROOT, filePath);

    if (
      !relativePath ||
      isAbsolute(relativePath) ||
      relativePath === '..' ||
      relativePath.startsWith(`..${sep}`)
    ) {
      return badRequest('잘못된 파일 경로입니다.');
    }

    const normalizedPath = relativePath.split(sep).join('/');
    const pathParts = normalizedPath.split('/');
    if (pathParts[0] === 'studio') {
      if (pathParts.length !== 2) return notFound('파일을 찾을 수 없습니다.');

      let db;
      try {
        db = getDb();
      } catch {
        return serviceUnavailable('파일 소유권을 확인할 수 없습니다.');
      }
      if (!db) return serviceUnavailable('파일 소유권을 확인할 수 없습니다.');

      try {
        const [ownedImage] = await db
          .select({ id: studioImages.id })
          .from(studioImages)
          .where(
            and(
              eq(studioImages.imageUrl, `/uploads/${normalizedPath}`),
              eq(studioImages.userId, session.userId)
            )
          )
          .limit(1);
        if (!ownedImage) return notFound('파일을 찾을 수 없습니다.');
      } catch {
        return serviceUnavailable('파일 소유권을 확인할 수 없습니다.');
      }
    } else {
      if (pathParts.length !== 1) return notFound('파일을 찾을 수 없습니다.');
      const access = getDocumentAccessByFileName(
        readDocumentMeta(),
        basename(normalizedPath),
        session.userId
      );
      if (access.status === 'legacy') return notFound(LEGACY_DOCUMENT_MESSAGE);
      if (access.status !== 'owned') return notFound('파일을 찾을 수 없습니다.');
    }

    let data: Buffer;
    try {
      data = await readFile(filePath);
    } catch {
      return notFound('파일을 찾을 수 없습니다.');
    }

    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
    const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';

    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err: unknown) {
    return internalError(err, 'File serving error');
  }
}
