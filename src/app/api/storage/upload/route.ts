import { NextRequest, NextResponse } from 'next/server';
import { uploadToBlob } from '@/server/blob';
import { badRequest, internalError } from '@/server/http';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return badRequest('업로드할 파일이 없습니다.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const blob = await uploadToBlob(`uploads/${Date.now()}-${file.name}`, buffer, {
      contentType: file.type,
      access: 'public',
    });

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    });
  } catch (err: any) {
    return internalError(err, 'Upload error');
  }
}
