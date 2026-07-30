import { z } from 'zod';
import { callLLMStructured } from '../../../services/llm';
import { getDb } from 'db';
import { resumes } from 'db/schema';
import { eq } from 'drizzle-orm';

const chatResponseSchema = z.object({
  responseText: z.string(),
  suggestedContent: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const resumeId = getRouterParam(event, 'id');
  if (!resumeId) {
    throw createError({
      statusCode: 400,
      statusMessage: '이력서 ID가 누락되었습니다.',
    });
  }

  const body = await readBody(event);
  const { message, messages, currentContent } = body || {};

  if (!message) {
    throw createError({
      statusCode: 400,
      statusMessage: '질문 메시지가 비어 있습니다.',
    });
  }

  // 1. 기존 DB 이력서 정보 조회
  const db = getDb();
  let resumeTitle = '이력서';
  if (db) {
    try {
      const [res] = await db.select().from(resumes).where(eq(resumes.id, resumeId));
      if (res) {
        resumeTitle = res.title;
      }
    } catch (e) {
      console.warn('[Kairos API] Resume query skipped:', e);
    }
  }

  // 2. AI Canvas 전용 가이드 지침 구성
  const instructions = `You are an elite career agent and professional resume editor helper (Kairos Canvas Agent).
You are chatting with a user who is editing their resume titled "${resumeTitle}" in the live workspace.

The current workspace content of the resume is:
---
${currentContent || ''}
---

Your role & response rules:
1. Discuss the candidate's career experience and offer professional guidance in Korean.
2. If the user asks to rewrite, add, change, format, or improve any part of the resume:
   - Provide the complete rewritten/improved resume content in the "suggestedContent" field. Do not omit any unchanged sections in suggestedContent; write the entire resume draft so the editor can be updated fully.
   - Explain what you changed and why in the "responseText" field.
3. If the user is only asking a generic question or chat that doesn't require modifying the resume, DO NOT populate the "suggestedContent" field.
4. Try to apply the STAR method (Situation, Task, Action, Result) and action verbs to quantify achievements.
5. All conversational dialogue must be in Korean.`;

  // 3. 이전 대화 맥락 복원
  let promptHistory = '';
  if (messages && Array.isArray(messages)) {
    promptHistory = messages
      .filter((m: any) => m.content)
      .map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n') + '\n';
  }
  promptHistory += `User: ${message}\n\nAssistant:`;

  try {
    const result = await callLLMStructured<{ responseText: string; suggestedContent?: string }>({
      instructions,
      prompt: promptHistory,
      schema: chatResponseSchema,
      temperature: 0.3,
    });

    return result;
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'AI와 대화하는 동안 오류가 발생했습니다.',
    });
  }
});
