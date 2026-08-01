import { NextRequest, NextResponse } from 'next/server';
import { uploadToBlob } from '@/server/blob';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '업로드할 파일이 없습니다.' }, { status: 400 });
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
    return NextResponse.json({ error: err.message || 'Upload error' }, { status: 500 });
  }
}
