import { z } from 'zod';
import { callLLMStructured, streamLLMText } from './llm';
import { buildContextWindow, type ContextMessage } from './context';

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
  const instructions = `You are a senior tech interviewer conducting a professional job interview at Kairos platform.
Ask an engaging, realistic initial interview question tailored to the target role, company, and difficulty level. Speak in polite Korean (존댓말).`;

  return await callLLMStructured<{ question: string; questionType: string; intent: string }>({
    instructions,
    prompt: `Target Job Title: ${jobTitle}\nCompany: ${companyName || 'Top Tier Tech Firm'}\nDifficulty Level: ${difficulty}`,
    schema: initialQuestionSchema,
    temperature: 0.7,
  });
}

export async function evaluateCandidateAnswer(jobTitle: string, conversationHistory: { sender: string; message: string }[]) {
  const instructions = `You are an expert interviewer at Kairos platform. Evaluate the candidate's latest response objectively. Provide constructive feedback, a performance score (0-100), and formulate a sharp follow-up or next topic question. Speak in Korean.`;

  const messages: ContextMessage[] = conversationHistory.map((h) => ({
    role: h.sender === 'ai' || h.sender === 'interviewer' ? 'assistant' : 'user',
    content: h.message,
  }));
  messages.unshift({ role: 'system', content: instructions });

  const context = buildContextWindow(messages, { windowSize: 15, maxTokens: 4000 });

  return await callLLMStructured<AnswerFeedback>({
    instructions,
    prompt: `Job Context: ${jobTitle}\n\n${context}`,
    schema: answerFeedbackSchema,
    temperature: 0.6,
  });
}

export async function streamInterviewerResponse(jobTitle: string, conversationHistory: { sender: string; message: string }[]) {
  const instructions = `You are an AI Interviewer at Kairos. Respond dynamically, acknowledge the candidate's last answer, provide subtle live feedback, and ask the next logical interview question. Keep it concise, natural, and immersive in Korean.`;

  const messages: ContextMessage[] = conversationHistory.map((h) => ({
    role: h.sender === 'ai' || h.sender === 'interviewer' ? 'assistant' : 'user',
    content: h.message,
  }));
  messages.unshift({ role: 'system', content: instructions });

  const context = buildContextWindow(messages, { windowSize: 15, maxTokens: 4000 });

  return await streamLLMText({
    instructions,
    prompt: `Job Role: ${jobTitle}\n\n${context}\n\nINTERVIEWER:`,
    temperature: 0.7,
  });
}
