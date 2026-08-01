import { NextRequest, NextResponse } from 'next/server';
import { getKairosMCPManifest } from '@/server/mcp';

export async function GET(_req: NextRequest) {
  return NextResponse.json(getKairosMCPManifest(), {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
