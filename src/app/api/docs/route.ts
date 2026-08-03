import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import { internalError, unauthorized } from '@/server/http';
import { existsSync } from 'node:fs';
import { UPLOAD_DIR, readDocumentMeta } from '@/server/documentStore';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    if (!existsSync(UPLOAD_DIR)) return NextResponse.json([]);
    const meta = readDocumentMeta()
      .filter((entry) => entry.userId === session.userId)
      .map(({ userId: _userId, ...entry }) => entry);
    return NextResponse.json(
      meta.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}
