import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, payloadTooLarge, unauthorized } from '@/server/http';
import { MAX_DOCUMENT_BYTES, validateDocumentUpload } from '@/server/documentUpload';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return badRequest('File is required');
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      return payloadTooLarge('문서 용량은 10MB 이하만 업로드할 수 있습니다.');
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    if (buffer.byteLength > MAX_DOCUMENT_BYTES) {
      return payloadTooLarge('문서 용량은 10MB 이하만 업로드할 수 있습니다.');
    }
    const validatedDocument = validateDocumentUpload(file.name, buffer);
    if (!validatedDocument) {
      return NextResponse.json({ error: '지원하지 않는 문서 형식이거나 파일 내용과 확장자가 일치하지 않습니다.' }, { status: 415 });
    }
    const ext = validatedDocument.extension;

    try {
      if (ext === 'hwp' || ext === 'hwpx') {
        const { parseHwp } = await import('@/server/hwpParser');
        const result = await parseHwp(buffer);
        return NextResponse.json({ text: result.text });
      }
      return NextResponse.json({ error: 'Unsupported format' }, { status: 422 });
    } catch (err) {
      return NextResponse.json(
        { error: `HWP 파싱 실패: ${(err as Error).message}` },
        { status: 422 }
      );
    }
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}
