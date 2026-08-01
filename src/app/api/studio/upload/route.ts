import { NextRequest, NextResponse } from 'next/server';
import { resolve, extname, join } from 'path';
import { getDb } from '@/db';
import { studioImages } from '@/db/schema';
import { getSession } from '@/server/getSession';

const STUDIO_DIR = resolve('uploads/studio');

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { mkdir, writeFile } = await import('node:fs/promises');
    await mkdir(STUDIO_DIR, { recursive: true });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    const ext = extname(file.name) || '.png';
    const filename = `upload-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
    const filePath = join(STUDIO_DIR, filename);
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const [record] = await db.insert(studioImages).values({
      userId: session.userId,
      type: 'uploaded',
      imageUrl: `/uploads/studio/${filename}`,
      originalFileName: file.name || filename,
    }).returning();

    return NextResponse.json({ image: record });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload error' }, { status: 500 });
  }
}
