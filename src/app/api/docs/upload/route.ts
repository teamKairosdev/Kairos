import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, payloadTooLarge, unauthorized } from '@/server/http';
import {
  UPLOAD_DIR,
  readDocumentMeta,
  writeDocumentMeta,
} from '@/server/documentStore';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const formData = await req.formData();
    const file = formData.get('file');
    const titleVal = formData.get('title');

    if (!(file instanceof File)) {
      return badRequest('File is required');
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      return payloadTooLarge('문서 용량은 10MB 이하만 업로드할 수 있습니다.');
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'hwp';
    const supportedExts = ['hwp', 'hwpx', 'docx', 'doc', 'pdf'];
    if (!supportedExts.includes(ext)) {
      return NextResponse.json({ error: `Unsupported format: .${ext}` }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const title = typeof titleVal === 'string' ? titleVal.trim() || file.name : file.name;
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

    const meta = readDocumentMeta();
    meta.push({
      id,
      userId: session.userId,
      title,
      ext,
      size: buffer.byteLength,
      createdAt: new Date().toISOString(),
      textContent,
    });
    writeDocumentMeta(meta);

    return NextResponse.json({ id, title, ext, size: buffer.byteLength, textContent });
  } catch (err: unknown) {
    console.error('[/api/docs/upload]', err);
    return internalError(err, 'Upload error');
  }
}
