import { getDb } from 'db';
import { mockInterviews, interviewMessages } from 'db/schema';
import { eq, asc } from 'drizzle-orm';
import { streamInterviewerResponse, evaluateCandidateAnswer, isDemoMode } from 'server/services/interview';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Interview ID missing' });

  const body = await readBody(event);
  const { candidateMessage, stream = false } = body || {};

  if (!candidateMessage) {
    throw createError({ statusCode: 400, statusMessage: 'Candidate message is required' });
  }

  let jobTitle = 'Software Engineer';
  let history: { sender: string; message: string }[] = [];

  // Load session & history from DB (skip if demo mode / no DB)
  const db = getDb();
  if (db && !id.startsWith('demo-')) {
    try {
      const [session] = await db.select().from(mockInterviews).where(eq(mockInterviews.id, id));
      jobTitle = session ? session.jobTitle : jobTitle;

      await db.insert(interviewMessages).values({
        interviewId: id,
        sender: 'candidate',
        message: candidateMessage,
      });

      const msgs = await db
        .select()
        .from(interviewMessages)
        .where(eq(interviewMessages.interviewId, id))
        .orderBy(asc(interviewMessages.createdAt));
      history = msgs.map((h) => ({ sender: h.sender, message: h.message }));
    } catch {
      console.warn('[Kairos] Interview chat DB load skipped (demo mode)');
    }
  } else {
    // Demo mode: build minimal history from current message
    history = [{ sender: 'candidate', message: candidateMessage }];
  }

  // Evaluate candidate answer using LLM (supports demo mode via service layer)
  const feedback = await evaluateCandidateAnswer(jobTitle, history);

  // Save AI response to DB if available
  if (db && !id.startsWith('demo-')) {
    try {
      await db.insert(interviewMessages).values({
        interviewId: id,
        sender: 'interviewer',
        message: feedback.nextQuestion,
        questionType: feedback.nextQuestionType,
        feedback: { score: feedback.score, summary: feedback.summary, tip: feedback.tip },
      });
    } catch {
      console.warn('[Kairos] Interview response save skipped (demo mode)');
    }
  }

  return { feedback, nextQuestion: feedback.nextQuestion };
});

