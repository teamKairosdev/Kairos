import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { streamLLMText, collectStreamText } from '@/server/llm';
import { getCachedResponse, setCachedResponse } from '@/server/llmCache';
import { getSession } from '@/server/getSession';
import { badRequest, internalError, unauthorized } from '@/server/http';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();

    const body = await req.json();
    const resumeText = typeof body?.resumeText === 'string' ? body.resumeText : '';
    const jobDescription = typeof body?.jobDescription === 'string' ? body.jobDescription : '';

    if (!resumeText) {
      return badRequest('Resume text is required');
    }
    if (resumeText.length > 100_000 || jobDescription.length > 30_000) {
      return badRequest('입력 길이가 제한을 초과했습니다.');
    }

    const cacheInput = JSON.stringify({ userId: session.userId, resumeText, jobDescription });
    const cacheKey = `refine:${createHash('sha256').update(cacheInput).digest('hex')}`;
    const cached = await getCachedResponse(cacheKey, 'refine');
    if (cached) {
      return new Response(cached, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const instructions = `You are Kairos AI, an elite career steward and resume rewriting specialist.
Rewrite the candidate's resume applying the STAR method (Situation, Task, Action, Result),
dynamic action verbs, quantified achievements, and professional Korean tone.
Focus on maximizing professional impact and ATS compatibility.`;

    const prompt = jobDescription
      ? `Target Job Description:\n${jobDescription}\n\nCandidate Resume:\n${resumeText}`
      : `Candidate Resume:\n${resumeText}`;

    const stream = await streamLLMText({
      instructions,
      prompt,
      temperature: 0.4,
    });

    const [clientStream, cacheStream] = stream.tee();
    void collectStreamText(cacheStream).then((text) => {
      if (text) {
        void setCachedResponse(cacheKey, 'refine', text, 3600);
      }
    });

    return new Response(clientStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err: unknown) {
    console.error('[/api/llm/refine]', err);
    return internalError(err, 'Refine error');
  }
}
