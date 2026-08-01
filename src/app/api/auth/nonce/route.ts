import { NextResponse } from 'next/server';

export async function GET() {
  const nonce = `kairos-nonce-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const id = `nonce-${Date.now()}`;
  return NextResponse.json({ nonce, id });
}
