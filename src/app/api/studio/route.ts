import { NextRequest, NextResponse } from 'next/server';
import { resolve, join, extname } from 'path';
import { getDb } from '@/db';
import { studioImages } from '@/db/schema';
import { generateImage } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getSession } from '@/server/getSession';

const STUDIO_DIR = resolve('uploads/studio');

async function ensureStudioDir() {
  const { mkdir } = await import('node:fs/promises');
  await mkdir(STUDIO_DIR, { recursive: true });
}

export async function GET(req: NextRequest) {
  // List studio images for current user
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const db = getDb();
    if (!db) return NextResponse.json({ images: [] });

    const { studioImages: si } = await import('@/db/schema');
    const { eq, desc } = await import('drizzle-orm');
    const images = await db
      .select()
      .from(si)
      .where(eq(si.userId, session.userId))
      .orderBy(desc(si.createdAt))
      .limit(50);

    return NextResponse.json({ images });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json({ error: 'GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다.' }, { status: 503 });
    }

    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { prompt, n = 1, size = '1024x1024' } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: '프롬프트를 입력해주세요.' }, { status: 400 });
    }

    await ensureStudioDir();

    const google = createGoogleGenerativeAI({ apiKey: googleApiKey });
    const { images } = await generateImage({
      model: google.image('imagen-3.0-generate-001'),
      prompt,
      n: Math.min(n, 1),
      size,
    });

    const imageData = images[0];
    const base64Data = imageData.base64;

    if (!base64Data) {
      return NextResponse.json({ error: '이미지 생성 실패: base64 데이터가 없습니다.' }, { status: 502 });
    }

    const filename = `gen-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.png`;
    const { writeFile } = await import('node:fs/promises');
    const filePath = join(STUDIO_DIR, filename);
    await writeFile(filePath, Buffer.from(base64Data, 'base64'));
    const localUrl = `/uploads/studio/${filename}`;

    const db = getDb();
    if (!db) {
      return NextResponse.json({ image: { id: 'demo-img', prompt: prompt, imageUrl: localUrl } });
    }

    const [record] = await db.insert(studioImages).values({
      userId: session.userId,
      type: 'generated',
      prompt: prompt,
      imageUrl: localUrl,
      width: parseInt(size.split('x')[0]),
      height: parseInt(size.split('x')[1]),
    }).returning();

    return NextResponse.json({ image: record });
  } catch (err: any) {
    console.error('[/api/studio]', err);
    return NextResponse.json({ error: err.message || 'Studio error' }, { status: 500 });
  }
}
