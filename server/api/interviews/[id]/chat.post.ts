import { db } from 'db';
import { mockInterviews, interviewMessages } from 'db/schema';
import { eq, asc } from 'drizzle-orm';
import { streamInterviewerResponse, evaluateCandidateAnswer } from 'server/services/interview';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Interview ID missing' });

  const body = await readBody(event);
  const { candidateMessage, stream = true } = body || {};

  if (!candidateMessage) {
    throw createError({ statusCode: 400, statusMessage: 'Candidate message is required' });
  }

  // Get current session
  const [session] = await db.select().from(mockInterviews).where(eq(mockInterviews.id, id));
  const jobTitle = session ? session.jobTitle : 'Software Engineer';

  // Save candidate message
  await db.insert(interviewMessages).values({
    interviewId: id,
    sender: 'candidate',
    message: candidateMessage,
  });

  // Fetch full conversation history
  const history = await db
    .select()
    .from(interviewMessages)
    .where(eq(interviewMessages.interviewId, id))
    .orderBy(asc(interviewMessages.createdAt));

  // Evaluate candidate answer using LLM
  const feedback = await evaluateCandidateAnswer(
    jobTitle,
    history.map((h) => ({ sender: h.sender, message: h.message }))
  );

  if (stream) {
    // SSE Stream
    const streamResult = await streamInterviewerResponse(
      jobTitle,
      history.map((h) => ({ sender: h.sender, message: h.message }))
    );

    return streamResult.toDataStreamResponse({
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } else {
    // Standard response format with feedback
    await db.insert(interviewMessages).values({
      interviewId: id,
      sender: 'interviewer',
      message: feedback.nextQuestion,
      questionType: feedback.nextQuestionType,
      feedback: {
        score: feedback.score,
        summary: feedback.summary,
        tip: feedback.tip,
      },
    });

    return {
      feedback,
      nextQuestion: feedback.nextQuestion,
    };
  }
});
