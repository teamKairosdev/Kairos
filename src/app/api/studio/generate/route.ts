import { NextRequest, NextResponse } from 'next/server';
import { resolve, join } from 'path';
import { getDb } from '@/db';
import { studioImages } from '@/db/schema';
import { generateStudioImage } from '@/server/imageGen';
import { getSession } from '@/server/getSession';
import { unauthorized, badRequest, internalError } from '@/server/http';

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

    const { prompt } = await req.json();
    if (!prompt) {
      return badRequest('프롬프트를 입력해주세요.');
    }

    await ensureStudioDir();

    const base64Data = await generateStudioImage(prompt);

    const filename = `gen-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.png`;
    const { writeFile } = await import('node:fs/promises');
    const filePath = join(STUDIO_DIR, filename);
    await writeFile(filePath, Buffer.from(base64Data, 'base64'));
    const localUrl = `/uploads/studio/${filename}`;

    const db = getDb();
    if (!db) {
      return NextResponse.json({ image: { id: 'demo-img', prompt, imageUrl: localUrl } });
    }

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

    return NextResponse.json({ image: record });
  } catch (err: any) {
    console.error('[/api/studio/generate]', err);
    return internalError(err, 'Studio error');
  }
}
