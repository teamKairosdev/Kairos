import { c as defineEventHandler, h as getRouterParam, e as createError, r as readBody } from '../../../../_/nitro.mjs';
import { d as db, m as mockInterviews, i as interviewMessages } from '../../../../_/index.mjs';
import { eq, asc } from 'drizzle-orm';
import { evaluateCandidateAnswer, streamInterviewerResponse } from 'server/services/interview';
import 'node:crypto';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:async_hooks';
import 'node:fs';
import 'node:url';
import 'jsonwebtoken';
import '@iconify/utils';
import 'consola';
import 'node:path';
import 'drizzle-orm/node-postgres';
import 'pg';
import 'drizzle-orm/pg-core';

const chat_post = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Interview ID missing" });
  const body = await readBody(event);
  const { candidateMessage, stream = true } = body || {};
  if (!candidateMessage) {
    throw createError({ statusCode: 400, statusMessage: "Candidate message is required" });
  }
  const [session] = await db.select().from(mockInterviews).where(eq(mockInterviews.id, id));
  const jobTitle = session ? session.jobTitle : "Software Engineer";
  await db.insert(interviewMessages).values({
    interviewId: id,
    sender: "candidate",
    message: candidateMessage
  });
  const history = await db.select().from(interviewMessages).where(eq(interviewMessages.interviewId, id)).orderBy(asc(interviewMessages.createdAt));
  const feedback = await evaluateCandidateAnswer(
    jobTitle,
    history.map((h) => ({ sender: h.sender, message: h.message }))
  );
  if (stream) {
    const streamResult = await streamInterviewerResponse(
      jobTitle,
      history.map((h) => ({ sender: h.sender, message: h.message }))
    );
    return streamResult.toDataStreamResponse({
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });
  } else {
    await db.insert(interviewMessages).values({
      interviewId: id,
      sender: "interviewer",
      message: feedback.nextQuestion,
      questionType: feedback.nextQuestionType,
      feedback: {
        score: feedback.score,
        summary: feedback.summary,
        tip: feedback.tip
      }
    });
    return {
      feedback,
      nextQuestion: feedback.nextQuestion
    };
  }
});

export { chat_post as default };
//# sourceMappingURL=chat.post.mjs.map
