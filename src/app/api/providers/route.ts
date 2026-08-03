import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/getSession';
import { unauthorized } from '@/server/http';
import { healthCheckProvider, listPublicProviders } from '@/server/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) return unauthorized();

  const configured = listPublicProviders();
  const providers = await Promise.all(
    configured.map(async (provider) => {
      const health = provider.enabled
        ? await healthCheckProvider(provider.id)
        : { status: 'not-applicable' as const };
      return {
        id: provider.id,
        name: provider.name,
        kind: provider.kind,
        capabilities: provider.capabilities,
        enabled: provider.enabled,
        license: provider.license,
        health: health.status,
      };
    }),
  );

  return NextResponse.json({ providers });
}
