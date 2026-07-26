import { db } from 'db';
import { mockInterviews, interviewMessages } from 'db/schema';
import { createInitialInterviewQuestion } from 'server/services/interview';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { jobTitle, companyName, difficulty = 'medium' } = body || {};

  if (!jobTitle) {
    throw createError({ statusCode: 400, statusMessage: '직무명을 입력해주세요.' });
  }

  const userId = event.context.user?.userId || '00000000-0000-0000-0000-000000000000';

  const [session] = await db
    .insert(mockInterviews)
    .values({
      userId,
      jobTitle,
      companyName: companyName || '목표 기업',
      difficulty,
      status: 'in_progress',
    })
    .returning();

  // Create initial LLM question
  const initialQ = await createInitialInterviewQuestion(jobTitle, companyName, difficulty);

  await db.insert(interviewMessages).values({
    interviewId: session.id,
    sender: 'interviewer',
    message: initialQ.question,
    questionType: initialQ.questionType,
  });

  return {
    session,
    initialQuestion: initialQ,
  };
});
