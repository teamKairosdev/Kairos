import { NextRequest } from 'next/server';
import { resolve } from 'path';
import { readFile } from 'node:fs/promises';
import { badRequest, notFound, internalError } from '@/server/http';

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
    const { path } = await params;
    const filePath = resolve(UPLOADS_ROOT, ...path);

    if (!filePath.startsWith(UPLOADS_ROOT + '/')) {
      return badRequest('잘못된 파일 경로입니다.');
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
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: unknown) {
    return internalError(err, 'File serving error');
  }
}
