import { NextRequest, NextResponse } from 'next/server';
import { uploadToBlob } from '@/server/blob';
import { getSession } from '@/server/getSession';
import { MAX_PUBLIC_UPLOAD_BYTES, validateUpload } from '@/server/uploadPolicy';
import { badRequest, internalError, payloadTooLarge, unauthorized } from '@/server/http';

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

    const blob = await uploadToBlob(
      `uploads/${crypto.randomUUID()}.${validatedUpload.extension}`,
      buffer,
      {
        contentType: validatedUpload.contentType,
        access: 'public',
      }
    );

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    });
  } catch (err: unknown) {
    return internalError(err, 'Upload error');
  }
}
