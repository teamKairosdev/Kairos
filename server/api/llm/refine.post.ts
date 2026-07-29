import { generateText } from 'ai';
import { getModelForComplexity } from 'server/services/llm';
import { getCachedResponse, setCachedResponse } from 'server/services/llmCache';

export default defineEventHandler(async (event) => {
  const { resumeText, jobDescription } = await readBody(event);

  if (!resumeText) {
    throw createError({ statusCode: 400, statusMessage: 'Resume text is required' });
  }

  const cacheKey = `refine:${resumeText.slice(0, 200)}:${jobDescription?.slice(0, 200) || ''}`;
  try {
    const cached = await getCachedResponse(cacheKey, 'refine');
    if (cached) {
      try {
        return { success: true, cached: true, result: JSON.parse(cached) };
      } catch {
        // malformed cache, fall through
      }
    }
  } catch {
    // cache error, fall through
  }

  const model = getModelForComplexity('high');

  const instructions = `You are Kairos AI, an elite career steward and resume rewriting specialist.
Rewrite the candidate's resume applying the STAR method (Situation, Task, Action, Result),
dynamic action verbs, quantified achievements, and professional Korean tone.
Focus on maximizing professional impact and ATS compatibility.`;

  const prompt = jobDescription
    ? `Target Job Description:\n${jobDescription}\n\nCandidate Resume:\n${resumeText}`
    : `Candidate Resume:\n${resumeText}`;

  const result = await generateText({
    model,
    instructions,
    prompt,
    temperature: 0.4,
  });

  const response = { success: true, cached: false, result: result.text };

  try {
    await setCachedResponse(cacheKey, 'refine', JSON.stringify(response), 3600);
  } catch {
    // non-critical
  }

  return response;
});
