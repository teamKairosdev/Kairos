import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { careers } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSession } from '@/server/getSession';
import { createCareerEntry } from '@/server/career';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: '데이터베이스에 연결할 수 없습니다.' }, { status: 503 });
    }

    const result = await db
      .select()
      .from(careers)
      .where(eq(careers.userId, session.userId))
      .orderBy(desc(careers.createdAt));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await req.json();
    const { company, role, period, description, achievements } = body || {};

    if (!company || !role || !description) {
      return NextResponse.json(
        { error: '회사명, 직무, 주요 설명은 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    const newEntry = await createCareerEntry({
      userId: session.userId,
      company,
      role,
      period: period || '기타',
      description,
      achievements: achievements || [],
    });

    return NextResponse.json(newEntry);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}
