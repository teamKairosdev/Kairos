import { NextRequest, NextResponse } from 'next/server';
import { resolve, join } from 'node:path';
import { getSession } from '@/server/getSession';
import { getDb } from '@/db';
import { studioImages } from '@/db/schema';
import { MAX_PUBLIC_UPLOAD_BYTES, validateUpload } from '@/server/uploadPolicy';
import { badRequest, internalError, payloadTooLarge, serviceUnavailable, unauthorized } from '@/server/http';

const STORAGE_DIR = resolve(process.cwd(), 'uploads', 'studio');

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return badRequest('업로드할 파일이 없습니다.');
    }

    if (file.size > MAX_PUBLIC_UPLOAD_BYTES) {
      return payloadTooLarge('파일 용량은 10MB 이하만 업로드할 수 있습니다.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.byteLength > MAX_PUBLIC_UPLOAD_BYTES) {
      return payloadTooLarge('파일 용량은 10MB 이하만 업로드할 수 있습니다.');
    }

    const validatedUpload = validateUpload(file.name, file.type, buffer);
    if (!validatedUpload) {
      return NextResponse.json({ error: '허용되지 않는 파일 형식입니다.' }, { status: 415 });
    }

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    const filename = `storage-${crypto.randomUUID()}.${validatedUpload.extension}`;
    const imageUrl = `/uploads/studio/${filename}`;
    const { mkdir, unlink, writeFile } = await import('node:fs/promises');
    await mkdir(STORAGE_DIR, { recursive: true });
    const filePath = join(STORAGE_DIR, filename);
    await writeFile(filePath, buffer, { flag: 'wx', mode: 0o600 });

    let image: typeof studioImages.$inferSelect | undefined;
    try {
      [image] = await db.insert(studioImages).values({
        userId: session.userId,
        type: 'uploaded',
        imageUrl,
        originalFileName: (file.name.split(/[\\/]/).pop() || filename).slice(0, 255),
        width: null,
        height: null,
      }).returning();
      if (!image) throw new Error('이미지 메타데이터 저장 결과가 없습니다.');
    } catch (error: unknown) {
      await unlink(filePath).catch(() => undefined);
      throw error;
    }

    return NextResponse.json({
      url: imageUrl,
      pathname: imageUrl,
      contentType: validatedUpload.contentType,
      image,
    });
  } catch (err: unknown) {
    return internalError(err, 'Upload error');
  }
}
