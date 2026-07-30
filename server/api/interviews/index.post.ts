import { getDb } from 'db';
import { mockInterviews, interviewMessages } from 'db/schema';
import { createInitialInterviewQuestion } from 'server/services/interview';

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId;

  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' });
  }

  const body = await readBody(event);
  const { jobTitle, companyName, difficulty = 'medium' } = body || {};

  if (!jobTitle) {
    throw createError({ statusCode: 400, statusMessage: '직무명을 입력해주세요.' });
  }

  const db = getDb();
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: '데이터베이스에 연결할 수 없습니다.' });
  }

  // Generate initial question via AI
  const initialQ = await createInitialInterviewQuestion(jobTitle, companyName, difficulty);

  // Create session in DB
  const [session] = await db
    .insert(mockInterviews)
    .values({ userId, jobTitle, companyName: companyName || null, difficulty, status: 'in_progress' })
    .returning();

  if (!session) {
    throw createError({ statusCode: 500, statusMessage: '면접 세션 생성에 실패했습니다.' });
  }

  // Save the AI's first message
  await db.insert(interviewMessages).values({
    interviewId: session.id,
    sender: 'interviewer',
    message: initialQ.question,
    questionType: initialQ.questionType,
  });

  return { session, initialQuestion: initialQ };
});
