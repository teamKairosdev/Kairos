import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { internalError } from '@/server/http';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
const META_FILE = join(UPLOAD_DIR, '.metadata.json');

interface DocMeta {
  id: string;
  title: string;
  ext: string;
  size: number;
  createdAt: string;
}

function readMeta(): DocMeta[] {
  if (!existsSync(META_FILE)) return [];
  return JSON.parse(readFileSync(META_FILE, 'utf-8'));
}

export async function GET(_req: NextRequest) {
  try {
    if (!existsSync(UPLOAD_DIR)) return NextResponse.json([]);
    const meta = readMeta();
    return NextResponse.json(
      meta.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  } catch (err: any) {
    return internalError(err, 'Error');
  }
}
