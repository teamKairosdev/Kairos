import { getDb } from 'db';
import { mockInterviews, interviewMessages } from 'db/schema';
import { createInitialInterviewQuestion } from 'server/services/interview';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { jobTitle, companyName, difficulty = 'medium' } = body || {};

  if (!jobTitle) {
    throw createError({ statusCode: 400, statusMessage: '직무명을 입력해주세요.' });
  }

  const userId = event.context.user?.userId || '00000000-0000-0000-0000-000000000000';

  // Generate initial question (supports demo mode via service layer)
  const initialQ = await createInitialInterviewQuestion(jobTitle, companyName, difficulty);

  // Attempt DB session creation (graceful in demo mode)
  let session: { id: string; jobTitle: string; companyName: string; difficulty: string; status: string } = {
    id: 'demo-interview-' + Date.now(),
    jobTitle,
    companyName: companyName || '목표 기업',
    difficulty,
    status: 'in_progress',
  };

  try {
    const db = getDb();
    if (db) {
      const [saved] = await db
        .insert(mockInterviews)
        .values({ userId, jobTitle, companyName: companyName || '목표 기업', difficulty, status: 'in_progress' })
        .returning();
      session = saved;

      await db.insert(interviewMessages).values({
        interviewId: session.id,
        sender: 'interviewer',
        message: initialQ.question,
        questionType: initialQ.questionType,
      });
    }
  } catch {
    console.warn('[Kairos] Interview session save skipped (demo mode - no DB)');
  }

  return { session, initialQuestion: initialQ };
});

