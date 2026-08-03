import { NextRequest, NextResponse } from 'next/server';
import { callLLMStructured } from '@/server/llm';
import { z } from 'zod';
import { getSession } from '@/server/getSession';
import { getDb } from '@/db';
import { resumes } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { notFound, unauthorized } from '@/server/http';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const { id } = await params;
    const db = getDb();
    if (db) {
      const [resume] = await db
        .select({ id: resumes.id })
        .from(resumes)
        .where(and(eq(resumes.id, id), eq(resumes.userId, session.userId)));
      if (!resume) return notFound('Resume not found');
    }

    const body = await req.json();
    const { message, currentContent } = body || {};

    const prompt = `사용자가 이력서 수정을 요청했습니다.
현재 이력서 본문:
${currentContent || ''}

사용자 요청:
${message}

답변은 사용자의 질의에 친절히 응답(responseText)하고, 만약 이력서 수정 제안이 필요하다면 개선된 전체 이력서 본문을 suggestedContent에 담아주세요.`;

    const chatSchema = z.object({
      responseText: z.string(),
      suggestedContent: z.string().optional(),
    });

    const result = await callLLMStructured<{
      responseText: string;
      suggestedContent?: string;
    }>({
      prompt,
      schema: chatSchema,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({
      responseText: '죄송합니다. 요청을 처리하는 중 오류가 발생했습니다.',
    });
  }
}
