import { c as defineEventHandler, r as readBody, e as createError } from '../../_/nitro.mjs';
import { d as db, m as mockInterviews, i as interviewMessages } from '../../_/index.mjs';
import { createInitialInterviewQuestion } from 'server/services/interview';
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
import 'drizzle-orm';

const index_post = defineEventHandler(async (event) => {
  var _a;
  const body = await readBody(event);
  const { jobTitle, companyName, difficulty = "medium" } = body || {};
  if (!jobTitle) {
    throw createError({ statusCode: 400, statusMessage: "\uC9C1\uBB34\uBA85\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694." });
  }
  const userId = ((_a = event.context.user) == null ? void 0 : _a.userId) || "00000000-0000-0000-0000-000000000000";
  const [session] = await db.insert(mockInterviews).values({
    userId,
    jobTitle,
    companyName: companyName || "\uBAA9\uD45C \uAE30\uC5C5",
    difficulty,
    status: "in_progress"
  }).returning();
  const initialQ = await createInitialInterviewQuestion(jobTitle, companyName, difficulty);
  await db.insert(interviewMessages).values({
    interviewId: session.id,
    sender: "interviewer",
    message: initialQ.question,
    questionType: initialQ.questionType
  });
  return {
    session,
    initialQuestion: initialQ
  };
});

export { index_post as default };
//# sourceMappingURL=index2.post.mjs.map
