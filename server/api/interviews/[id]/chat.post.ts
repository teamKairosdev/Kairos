import { evaluateCandidateAnswer } from 'server/services/interview';
import { getDb } from 'db';
import { mockInterviews, interviewMessages } from 'db/schema';
import { eq, asc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Interview ID missing' });

  const body = await readBody(event);
  const { candidateMessage } = body || {};

  if (!candidateMessage || !candidateMessage.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Candidate message is required' });
  }

  let jobTitle = 'Software Engineer';
  let conversationHistory: { sender: string; message: string }[] = [];

  const db = getDb();
  if (db && !id.startsWith('demo-')) {
    try {
      const [session] = await db.select().from(mockInterviews).where(eq(mockInterviews.id, id));
      if (session) jobTitle = session.jobTitle;

      await db.insert(interviewMessages).values({
        interviewId: id,
        sender: 'candidate',
        message: candidateMessage,
      });

      const messages = await db
        .select()
        .from(interviewMessages)
        .where(eq(interviewMessages.interviewId, id))
        .orderBy(asc(interviewMessages.createdAt));

      conversationHistory = messages.map(m => ({ sender: m.sender, message: m.message }));
    } catch {
      console.warn('[Kairos] Interview DB load skipped');
    }
  }

  if (conversationHistory.length === 0) {
    conversationHistory = [
      { sender: 'interviewer', message: '안녕하세요! 면접을 시작하겠습니다.' },
      { sender: 'candidate', message: candidateMessage },
    ];
  }

  const result = await evaluateCandidateAnswer(jobTitle, conversationHistory);

  if (db && !id.startsWith('demo-')) {
    try {
      await db.insert(interviewMessages).values({
        interviewId: id,
        sender: 'interviewer',
        message: result.nextQuestion,
        feedback: { score: result.score, summary: result.summary, tip: result.tip },
      });
    } catch {
      console.warn('[Kairos] Interview DB save skipped');
    }
  }

  return {
    feedback: { score: result.score, summary: result.summary, tip: result.tip },
    nextQuestion: result.nextQuestion,
    nextQuestionType: result.nextQuestionType,
  };
});
