import { c as defineEventHandler, r as readBody, e as createError } from '../../../_/nitro.mjs';
import { generateQASet } from 'server/services/qa';
import { d as db, q as qaSets } from '../../../_/index.mjs';
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

const generate_post = defineEventHandler(async (event) => {
  var _a;
  const body = await readBody(event);
  const { targetRole, careerSummary, count = 5 } = body || {};
  if (!targetRole || !careerSummary) {
    throw createError({ statusCode: 400, statusMessage: "\uBAA9\uD45C \uC9C1\uBB34\uC640 \uACBD\uB825 \uC694\uC57D \uD14D\uC2A4\uD2B8\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694." });
  }
  const userId = ((_a = event.context.user) == null ? void 0 : _a.userId) || "00000000-0000-0000-0000-000000000000";
  const qaResult = await generateQASet(targetRole, careerSummary, count);
  const [saved] = await db.insert(qaSets).values({
    userId,
    title: `${targetRole} \uC608\uC0C1 \uBA74\uC811 Q&A \uC138\uD2B8`,
    targetRole,
    qaPairs: qaResult.qaPairs
  }).returning();
  return {
    id: saved.id,
    qaSet: qaResult
  };
});

export { generate_post as default };
//# sourceMappingURL=generate.post.mjs.map
