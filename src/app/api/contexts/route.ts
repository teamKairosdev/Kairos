import { NextRequest, NextResponse } from 'next/server';
import { GET as getProviders, POST as createProvider } from './providers/route';
import { GET as getItems } from './items/route';

export async function GET(req: NextRequest) {
  const [providersResponse, itemsResponse] = await Promise.all([
    getProviders(req),
    getItems(req),
  ]);
  if (!providersResponse.ok) return providersResponse;
  if (!itemsResponse.ok) return itemsResponse;

  const providers = (await providersResponse.json()) as unknown;
  const itemData = (await itemsResponse.json()) as unknown;
  if (!itemData || typeof itemData !== 'object' || Array.isArray(itemData)) {
    return NextResponse.json({ error: 'context item 응답이 올바르지 않습니다.' }, { status: 500 });
  }
  return NextResponse.json({
    providers,
    ...itemData,
  });
}

export async function POST(req: NextRequest) {
  return createProvider(req);
}
