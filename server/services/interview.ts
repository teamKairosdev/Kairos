import { z } from 'zod';
import { callLLMStructured, streamLLMText, callLLMText } from './llm';

const initialQuestionSchema = z.object({
  question: z.string(),
  questionType: z.enum(['technical', 'behavioral', 'introductory']),
  intent: z.string(),
});

const answerFeedbackSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  tip: z.string(),
  nextQuestion: z.string(),
  nextQuestionType: z.enum(['technical', 'behavioral', 'followup']),
});

export type AnswerFeedback = z.infer<typeof answerFeedbackSchema>;

// Single function = Single LLM call (Generate initial question)
export async function createInitialInterviewQuestion(jobTitle: string, companyName?: string, difficulty: string = 'medium') {
  const systemPrompt = `You are a senior tech interviewer conducting a professional job interview at Kairos platform. 
Ask an engaging, realistic initial interview question tailored to the target role, company, and difficulty level. Speak in polite Korean (존댓말).`;

  return await callLLMStructured<{ question: string; questionType: string; intent: string }>({
    system: systemPrompt,
    prompt: `Target Job Title: ${jobTitle}\nCompany: ${companyName || 'Top Tier Tech Firm'}\nDifficulty Level: ${difficulty}`,
    schema: initialQuestionSchema,
    temperature: 0.7,
  });
}

// Single function = Single LLM call (Evaluate candidate response & generate follow-up)
export async function evaluateCandidateAnswer(jobTitle: string, conversationHistory: { sender: string; message: string }[]) {
  const systemPrompt = `You are an expert interviewer at Kairos platform. Evaluate the candidate's latest response objectively. Provide constructive feedback, a performance score (0-100), and formulate a sharp follow-up or next topic question. Speak in Korean.`;

  const formattedHistory = conversationHistory
    .map((h) => `${h.sender.toUpperCase()}: ${h.message}`)
    .join('\n');

  return await callLLMStructured<AnswerFeedback>({
    system: systemPrompt,
    prompt: `Job Context: ${jobTitle}\n\nInterview Conversation Log:\n${formattedHistory}`,
    schema: answerFeedbackSchema,
    temperature: 0.6,
  });
}

// SSE Streaming Interview Turn Response
export async function streamInterviewerResponse(jobTitle: string, conversationHistory: { sender: string; message: string }[]) {
  const systemPrompt = `You are an AI Interviewer at Kairos. Respond dynamically, acknowledge the candidate's last answer, provide subtle live feedback, and ask the next logical interview question. Keep it concise, natural, and immersive in Korean.`;

  const formattedHistory = conversationHistory
    .map((h) => `${h.sender.toUpperCase()}: ${h.message}`)
    .join('\n');

  return await streamLLMText({
    system: systemPrompt,
    prompt: `Job Role: ${jobTitle}\n\nInterview History:\n${formattedHistory}\n\nINTERVIEWER:`,
    temperature: 0.7,
  });
}
