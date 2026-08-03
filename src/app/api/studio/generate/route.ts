import { NextRequest, NextResponse } from 'next/server';
import { resolve, join } from 'path';
import { getDb } from '@/db';
import { studioImages } from '@/db/schema';
import { generateStudioImage } from '@/server/imageGen';
import { getSession } from '@/server/getSession';
import { unauthorized, badRequest, internalError, serviceUnavailable } from '@/server/http';

const STUDIO_DIR = resolve('uploads/studio');

async function ensureStudioDir() {
  const { mkdir } = await import('node:fs/promises');
  await mkdir(STUDIO_DIR, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return unauthorized();
    }

    const body = await req.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      return badRequest('프롬프트를 입력해주세요.');
    }
    if (prompt.length > 4_000) return badRequest('프롬프트가 너무 깁니다.');

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');

    await ensureStudioDir();

    const base64Data = await generateStudioImage(prompt);

    const filename = `gen-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.png`;
    const { writeFile } = await import('node:fs/promises');
    const filePath = join(STUDIO_DIR, filename);
    await writeFile(filePath, Buffer.from(base64Data, 'base64'), { flag: 'wx', mode: 0o600 });
    const localUrl = `/uploads/studio/${filename}`;
    try {
      const [record] = await db
        .insert(studioImages)
        .values({
          userId: session.userId,
          type: 'generated',
          prompt,
          imageUrl: localUrl,
          width: 1024,
          height: 1024,
        })
        .returning();
      if (!record) throw new Error('이미지 메타데이터 저장 결과가 없습니다.');
      return NextResponse.json({ image: record });
    } catch (error: unknown) {
      const { unlink } = await import('node:fs/promises');
      await unlink(filePath).catch(() => undefined);
      throw error;
    }
  } catch (err: unknown) {
    console.error('[/api/studio/generate]', err);
    return internalError(err, 'Studio error');
  }
}
