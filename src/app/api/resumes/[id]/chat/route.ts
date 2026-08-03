import { NextRequest, NextResponse } from 'next/server';
import { callLLMStructured } from '@/server/llm';
import { z } from 'zod';
import { getSession } from '@/server/getSession';
import { getDb } from '@/db';
import { resumes } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { badRequest, notFound, serviceUnavailable, unauthorized } from '@/server/http';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const { id } = await params;
    const db = getDb();
    if (!db) return serviceUnavailable('이력서 저장소를 사용할 수 없습니다.');
    const [resume] = await db
      .select({ id: resumes.id })
      .from(resumes)
      .where(and(eq(resumes.id, id), eq(resumes.userId, session.userId)));
    if (!resume) return notFound('Resume not found');

    const body = await req.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const currentContent = typeof body?.currentContent === 'string' ? body.currentContent : '';
    if (!message) return badRequest('메시지를 입력해주세요.');
    if (message.length > 10_000 || currentContent.length > 100_000) return badRequest('입력 길이가 제한을 초과했습니다.');

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
