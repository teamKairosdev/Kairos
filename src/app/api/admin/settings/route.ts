import { NextRequest, NextResponse } from 'next/server';
import { getAllSystemConfigs } from '@/server/systemConfig';
import { internalError } from '@/server/http';

export async function GET(_req: NextRequest) {
  try {
    const configs = await getAllSystemConfigs();
    return NextResponse.json({
      configs,
      envMappings: [
        { key: 'GOOGLE_GENERATIVE_AI_API_KEY', label: 'Google Gemini API Key', envVar: 'GOOGLE_GENERATIVE_AI_API_KEY' },
        { key: 'VERCEL_AI_GATEWAY_URL', label: 'Vercel AI Gateway URL', envVar: 'VERCEL_AI_GATEWAY_URL' },
        { key: 'VERCEL_AI_GATEWAY_KEY', label: 'Vercel AI Gateway Key', envVar: 'VERCEL_AI_GATEWAY_KEY' },
        { key: 'BLOB_READ_WRITE_TOKEN', label: 'Vercel Blob Token', envVar: 'BLOB_READ_WRITE_TOKEN' },
        { key: 'DATABASE_URL', label: 'NeonDB PostgreSQL URL', envVar: 'DATABASE_URL' },
        { key: 'GOOGLE_CLIENT_ID', label: 'Google OAuth Client ID', envVar: 'GOOGLE_CLIENT_ID' },
        { key: 'GOOGLE_CLIENT_SECRET', label: 'Google OAuth Client Secret', envVar: 'GOOGLE_CLIENT_SECRET' },
        { key: 'JWT_SECRET', label: 'JWT Session Secret', envVar: 'JWT_SECRET' },
      ],
    });
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}
