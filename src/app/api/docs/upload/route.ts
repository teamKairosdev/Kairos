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
import { MAX_DOCUMENT_BYTES, MAX_DOCUMENT_TEXT_BYTES, validateDocumentUpload } from '@/server/documentUpload';

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

    const id = crypto.randomUUID();
    const title = (typeof titleVal === 'string' ? titleVal.trim() || file.name : file.name)
      .replace(/[\r\n]/g, ' ')
      .slice(0, 255);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.byteLength > MAX_DOCUMENT_BYTES) {
      return payloadTooLarge('문서 용량은 10MB 이하만 업로드할 수 있습니다.');
    }
    const validatedDocument = validateDocumentUpload(file.name, buffer);
    if (!validatedDocument) {
      return NextResponse.json({ error: '지원하지 않는 문서 형식이거나 파일 내용과 확장자가 일치하지 않습니다.' }, { status: 415 });
    }
    const ext = validatedDocument.extension;
    const clientTextValue = formData.get('textContent');
    const clientText = typeof clientTextValue === 'string' ? clientTextValue : null;
    if (clientText && new TextEncoder().encode(clientText).byteLength > MAX_DOCUMENT_TEXT_BYTES) {
      return payloadTooLarge('문서 텍스트가 허용된 크기를 초과했습니다.');
    }

    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
    const destPath = join(UPLOAD_DIR, `${id}.${ext}`);
    writeFileSync(destPath, buffer, { mode: 0o600, flag: 'wx' });

    let textContent = '';
    try {
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
      if (new TextEncoder().encode(textContent).byteLength > MAX_DOCUMENT_TEXT_BYTES) {
        textContent = Buffer.from(textContent, 'utf8')
          .subarray(0, MAX_DOCUMENT_TEXT_BYTES)
          .toString('utf8');
      }
    } catch (e) {
      console.warn('[Docs] Text extraction failed:', (e as Error).message);
    }

    try {
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
    } catch (error: unknown) {
      const { unlinkSync } = await import('node:fs');
      unlinkSync(destPath);
      throw error;
    }

    return NextResponse.json({ id, title, ext, size: buffer.byteLength, textContent });
  } catch (err: unknown) {
    console.error('[/api/docs/upload]', err);
    return internalError(err, 'Upload error');
  }
}
