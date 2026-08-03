import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getSession } from '@/server/getSession';
import { badRequest, notFound, internalError, unauthorized } from '@/server/http';
import { findOwnedDocument, readDocumentMeta, UPLOAD_DIR, writeDocumentMeta } from '@/server/documentStore';

const MIME_MAP: Record<string, string> = {
  hwp: 'application/x-hwp',
  hwpx: 'application/x-hwp+xml',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  pdf: 'application/pdf',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const { id } = await params;
    if (!id) return badRequest('Document ID required');

    const meta = readDocumentMeta();
    const entry = findOwnedDocument(meta, id, session.userId);
    if (!entry) return notFound('Document not found');

    const wantsText = req.nextUrl.searchParams.get('text') === '1';
    if (wantsText) {
      const { title, ext, size, createdAt, textContent } = entry;
      return NextResponse.json({ id, title, ext, size, createdAt, textContent: textContent || '' });
    }

    const filePath = join(UPLOAD_DIR, `${id}.${entry.ext}`);
    if (!existsSync(filePath)) return notFound('File not found');

    const file = readFileSync(filePath);
    const contentType = MIME_MAP[entry.ext] || 'application/octet-stream';

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${entry.title.replace(/[\r\n"]/g, '_')}.${entry.ext}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const { id } = await params;
    if (!id) return badRequest('Document ID required');

    const meta = readDocumentMeta();
    const idx = meta.findIndex((entry) => entry.id === id && entry.userId === session.userId);
    if (idx === -1) return notFound('Document not found');

    const entry = meta[idx];
    const filePath = join(UPLOAD_DIR, `${id}.${entry.ext}`);
    if (existsSync(filePath)) {
      const { unlinkSync } = await import('fs');
      unlinkSync(filePath);
    }

    meta.splice(idx, 1);
    writeDocumentMeta(meta);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}
