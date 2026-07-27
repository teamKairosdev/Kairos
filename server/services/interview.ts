import { z } from 'zod';
import { callLLMStructured, streamLLMText, isDemoMode } from './llm';
export { isDemoMode } from './llm'; // re-export for API route consumers

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
  if (isDemoMode()) {
    console.info('[Kairos Demo] 초기 면접 질문 - 데모 모드 응답 반환');
    return {
      question: `안녕하세요! Kairos AI 면접에 오신 것을 환영합니다. 저는 오늘 "${jobTitle}" 포지션 면접을 진행할 AI 면접관입니다. 먼저 본인의 경력과 이 직무에 지원하게 된 동기를 간략히 소개해 주시겠습니까?`,
      questionType: 'introductory' as const,
      intent: '지원자의 커리어 방향성과 지원 동기를 파악합니다.',
    };
  }

  const instructions = `You are a senior tech interviewer conducting a professional job interview at Kairos platform.
Ask an engaging, realistic initial interview question tailored to the target role, company, and difficulty level. Speak in polite Korean (존댓말).`;

  return await callLLMStructured<{ question: string; questionType: string; intent: string }>({
    instructions,
    prompt: `Target Job Title: ${jobTitle}\nCompany: ${companyName || 'Top Tier Tech Firm'}\nDifficulty Level: ${difficulty}`,
    schema: initialQuestionSchema,
    temperature: 0.7,
  });
}

// Single function = Single LLM call (Evaluate candidate response & generate follow-up)
export async function evaluateCandidateAnswer(jobTitle: string, conversationHistory: { sender: string; message: string }[]) {
  if (isDemoMode()) {
    const lastMsg = conversationHistory.at(-1)?.message || '';
    return {
      score: 78,
      summary: '답변 구조가 명확하고 핵심을 잘 전달했습니다. STAR 기법을 활용해 상황-행동-결과를 더 구체적으로 연결하면 더욱 설득력이 높아집니다.',
      tip: '수치와 비율을 포함한 정량적 성과를 첨가하면 면접관의 신뢰도가 크게 올라갑니다.',
      nextQuestion: '방금 말씀하신 경험에서 가장 어려웠던 기술적 도전과, 그것을 어떻게 극복했는지 좀 더 구체적으로 말씀해 주시겠습니까?',
      nextQuestionType: 'followup' as const,
    };
  }

  const instructions = `You are an expert interviewer at Kairos platform. Evaluate the candidate's latest response objectively. Provide constructive feedback, a performance score (0-100), and formulate a sharp follow-up or next topic question. Speak in Korean.`;

  const formattedHistory = conversationHistory
    .map((h) => `${h.sender.toUpperCase()}: ${h.message}`)
    .join('\n');

  return await callLLMStructured<AnswerFeedback>({
    instructions,
    prompt: `Job Context: ${jobTitle}\n\nInterview Conversation Log:\n${formattedHistory}`,
    schema: answerFeedbackSchema,
    temperature: 0.6,
  });
}

// SSE Streaming Interview Turn Response
export async function streamInterviewerResponse(jobTitle: string, conversationHistory: { sender: string; message: string }[]) {
  const instructions = `You are an AI Interviewer at Kairos. Respond dynamically, acknowledge the candidate's last answer, provide subtle live feedback, and ask the next logical interview question. Keep it concise, natural, and immersive in Korean.`;

  const formattedHistory = conversationHistory
    .map((h) => `${h.sender.toUpperCase()}: ${h.message}`)
    .join('\n');

  return await streamLLMText({
    instructions,
    prompt: `Job Role: ${jobTitle}\n\nInterview History:\n${formattedHistory}\n\nINTERVIEWER:`,
    temperature: 0.7,
  });
}

