import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { getModelForComplexity } from '@/server/llm';
import { getCachedResponse, setCachedResponse } from '@/server/llmCache';

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jobDescription } = await req.json();

    if (!resumeText) {
      return NextResponse.json({ error: 'Resume text is required' }, { status: 400 });
    }

    const cacheKey = `refine:${resumeText.slice(0, 200)}:${jobDescription?.slice(0, 200) || ''}`;
    const cached = await getCachedResponse(cacheKey, 'refine');
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }

    const model = await getModelForComplexity('high');

    const instructions = `You are Kairos AI, an elite career steward and resume rewriting specialist.
Rewrite the candidate's resume applying the STAR method (Situation, Task, Action, Result),
dynamic action verbs, quantified achievements, and professional Korean tone.
Focus on maximizing professional impact and ATS compatibility.`;

    const prompt = jobDescription
      ? `Target Job Description:\n${jobDescription}\n\nCandidate Resume:\n${resumeText}`
      : `Candidate Resume:\n${resumeText}`;

    const result = streamText({
      model,
      system: instructions,
      prompt,
      temperature: 0.4,
      onFinish: async (event) => {
        if (event.text) {
          await setCachedResponse(cacheKey, 'refine', JSON.stringify({ text: event.text }), 3600);
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (err: any) {
    console.error('[/api/llm/refine]', err);
    return NextResponse.json({ error: err.message || 'Refine error' }, { status: 500 });
  }
}
