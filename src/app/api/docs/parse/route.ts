import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, unauthorized } from '@/server/http';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return badRequest('File is required');
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const arrayBuffer = await file.arrayBuffer();

    try {
      if (ext === 'hwp' || ext === 'hwpx') {
        const { parseHwp } = await import('@/server/hwpParser');
        const result = await parseHwp(new Uint8Array(arrayBuffer));
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
