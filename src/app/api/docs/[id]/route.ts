import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
const META_FILE = join(UPLOAD_DIR, '.metadata.json');

const MIME_MAP: Record<string, string> = {
  hwp: 'application/x-hwp',
  hwpx: 'application/x-hwp+xml',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  pdf: 'application/pdf',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Document ID required' }, { status: 400 });

    const meta = existsSync(META_FILE)
      ? JSON.parse(readFileSync(META_FILE, 'utf-8'))
      : [];
    const entry = meta.find((m: { id: string }) => m.id === id);
    if (!entry) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const filePath = join(UPLOAD_DIR, `${id}.${entry.ext}`);
    if (!existsSync(filePath)) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    const file = readFileSync(filePath);
    const contentType = MIME_MAP[entry.ext] || 'application/octet-stream';

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${entry.title}.${entry.ext}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Document ID required' }, { status: 400 });

    const meta = existsSync(META_FILE)
      ? JSON.parse(readFileSync(META_FILE, 'utf-8'))
      : [];
    const idx = meta.findIndex((m: { id: string }) => m.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const entry = meta[idx];
    const filePath = join(UPLOAD_DIR, `${id}.${entry.ext}`);
    if (existsSync(filePath)) {
      const { unlinkSync } = await import('fs');
      unlinkSync(filePath);
    }

    meta.splice(idx, 1);
    const { writeFileSync } = await import('fs');
    writeFileSync(META_FILE, JSON.stringify(meta, null, 2));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}
