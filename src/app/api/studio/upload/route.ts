import { NextRequest, NextResponse } from 'next/server';
import { resolve, join } from 'path';
import { getDb } from '@/db';
import { studioImages } from '@/db/schema';
import { getSession } from '@/server/getSession';
import { MAX_PUBLIC_UPLOAD_BYTES, validateUpload } from '@/server/uploadPolicy';
import { unauthorized, badRequest, internalError, payloadTooLarge, serviceUnavailable } from '@/server/http';

const STUDIO_DIR = resolve('uploads/studio');

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return unauthorized();
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return badRequest('파일이 없습니다.');
    }
    if (file.size > MAX_PUBLIC_UPLOAD_BYTES) {
      return payloadTooLarge('이미지 용량은 10MB 이하만 업로드할 수 있습니다.');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > MAX_PUBLIC_UPLOAD_BYTES) {
      return payloadTooLarge('이미지 용량은 10MB 이하만 업로드할 수 있습니다.');
    }
    const validatedUpload = validateUpload(file.name, file.type, buffer);
    if (!validatedUpload) {
      return NextResponse.json({ error: '지원하지 않는 이미지 형식이거나 파일 내용과 MIME이 일치하지 않습니다.' }, { status: 415 });
    }

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    const { mkdir, writeFile, unlink } = await import('node:fs/promises');
    await mkdir(STUDIO_DIR, { recursive: true });

    const filename = `upload-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${validatedUpload.extension}`;
    const filePath = join(STUDIO_DIR, filename);
    await writeFile(filePath, buffer, { flag: 'wx', mode: 0o600 });

    try {
      const [record] = await db.insert(studioImages).values({
        userId: session.userId,
        type: 'uploaded',
        imageUrl: `/uploads/studio/${filename}`,
        originalFileName: (file.name.split(/[\\/]/).pop() || filename).slice(0, 255),
      }).returning();
      if (!record) throw new Error('이미지 메타데이터 저장 결과가 없습니다.');

      return NextResponse.json({ image: record });
    } catch (error: unknown) {
      await unlink(filePath).catch(() => undefined);
      throw error;
    }
  } catch (err: unknown) {
    return internalError(err, 'Upload error');
  }
}
