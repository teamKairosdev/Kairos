import { NextRequest, NextResponse } from 'next/server';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { badRequest, internalError } from '@/server/http';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
const META_FILE = join(UPLOAD_DIR, '.metadata.json');

interface DocMeta {
  id: string;
  title: string;
  ext: string;
  size: number;
  createdAt: string;
  textContent: string;
}

function readMeta(): DocMeta[] {
  if (!existsSync(META_FILE)) return [];
  return JSON.parse(readFileSync(META_FILE, 'utf-8'));
}

function writeMeta(meta: DocMeta[]) {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
  writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const titleVal = formData.get('title') as string | null;

    if (!file) {
      return badRequest('File is required');
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'hwp';
    const supportedExts = ['hwp', 'hwpx', 'docx', 'doc', 'pdf'];
    if (!supportedExts.includes(ext)) {
      return NextResponse.json({ error: `Unsupported format: .${ext}` }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const title = titleVal?.trim() || file.name;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
    const destPath = join(UPLOAD_DIR, `${id}.${ext}`);
    writeFileSync(destPath, buffer);

    let textContent = '';
    try {
      const clientText = formData.get('textContent') as string | null;
      if (clientText) {
        textContent = clientText;
      } else if (ext === 'hwp' || ext === 'hwpx') {
        const { parseHwp } = await import('@/server/hwpParser');
        const result = await parseHwp(new Uint8Array(arrayBuffer));
        textContent = result.text;
      } else if (ext === 'docx' || ext === 'doc') {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        textContent = result.value;
      }
    } catch (e) {
      console.warn('[Docs] Text extraction failed:', (e as Error).message);
    }

    const meta = readMeta();
    meta.push({ id, title, ext, size: buffer.byteLength, createdAt: new Date().toISOString(), textContent });
    writeMeta(meta);

    return NextResponse.json({ id, title, ext, size: buffer.byteLength, textContent });
  } catch (err: unknown) {
    console.error('[/api/docs/upload]', err);
    return internalError(err, 'Upload error');
  }
}
