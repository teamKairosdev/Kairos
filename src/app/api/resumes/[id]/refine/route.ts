import { NextRequest, NextResponse } from 'next/server';
import { callLLMStructured } from '@/server/llm';
import { getDb } from '@/db';
import { resumes, resumeRefinements } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { notFound } from '@/server/http';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  let originalContent = '';
  let title = '';
  if (db) {
    const [target] = await db.select().from(resumes).where(eq(resumes.id, id));
    if (target) {
      originalContent = target.originalContent;
      title = target.title;
    }
  }

  if (!originalContent) {
    return notFound('Resume text not found');
  }

  const prompt = `이력서를 3단계로 정밀 고도화해주세요.
제목: ${title}
원본 내용:
${originalContent}

아래 구조로 평가 및 고도화 결과를 생성해주세요:
1. score (1~100 숫자)
2. strengths (강점 3개 배열)
3. weaknesses (개선 필요 2개 배열)
4. suggestions (추천 기재 2개 배열)
5. improvedContent (STAR 기법으로 재작성된 고도화 이력서 본문)`;

  try {
    const evalSchema = z.object({
      score: z.number(),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      suggestions: z.array(z.string()),
      improvedContent: z.string(),
    });

    const result = await callLLMStructured<{
      score: number;
      strengths: string[];
      weaknesses: string[];
      suggestions: string[];
      improvedContent: string;
    }>({
      prompt,
      schema: evalSchema,
    });

    if (db) {
      await db
        .update(resumes)
        .set({
          currentScore: result.score,
          status: 'improved',
          updatedAt: new Date(),
        })
        .where(eq(resumes.id, id));

      await db.insert(resumeRefinements).values({
        resumeId: id,
        step: 'improve',
        draftContent: originalContent,
        score: result.score,
        improvedContent: result.improvedContent,
        evaluationFeedback: {
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          suggestions: result.suggestions,
        },
      });
    }

    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '이력서 고도화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
