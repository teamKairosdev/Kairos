import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { chatSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { badRequest, notFound } from '@/server/http';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return badRequest('Chat ID missing');

  const db = getDb();
  if (db) {
    try {
      const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
      if (session) return NextResponse.json(session);
    } catch {
      console.warn('[Kairos] chat/[id] DB load failed');
    }
  }

  return notFound('Chat session not found');
}
