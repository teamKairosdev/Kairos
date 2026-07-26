import { c as defineEventHandler, r as readBody, e as createError } from '../../_/nitro.mjs';
import { d as db, r as resumes } from '../../_/index.mjs';
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
  const { title, originalContent } = body || {};
  if (!title || !originalContent) {
    throw createError({ statusCode: 400, statusMessage: "\uC81C\uBAA9\uACFC \uC774\uB825\uC11C \uBCF8\uBB38\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694." });
  }
  const userId = ((_a = event.context.user) == null ? void 0 : _a.userId) || "00000000-0000-0000-0000-000000000000";
  const [newResume] = await db.insert(resumes).values({
    userId,
    title,
    originalContent,
    status: "draft",
    currentScore: 50
  }).returning();
  return newResume;
});

export { index_post as default };
//# sourceMappingURL=index3.post.mjs.map
