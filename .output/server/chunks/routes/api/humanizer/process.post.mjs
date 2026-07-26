import { c as defineEventHandler, r as readBody, e as createError } from '../../../_/nitro.mjs';
import { processAIHumanizer } from 'server/services/humanizer';
import { d as db, h as humanizedTexts } from '../../../_/index.mjs';
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

const process_post = defineEventHandler(async (event) => {
  var _a;
  const body = await readBody(event);
  const { originalText } = body || {};
  if (!originalText || originalText.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: "\uBCC0\uD658\uD560 \uBB38\uC7A5\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694." });
  }
  const userId = ((_a = event.context.user) == null ? void 0 : _a.userId) || "00000000-0000-0000-0000-000000000000";
  const result = await processAIHumanizer(originalText);
  await db.insert(humanizedTexts).values({
    userId,
    originalText,
    humanizedText: result.humanizedText,
    styleScore: result.styleScore,
    changesSummary: result.changesSummary
  });
  return result;
});

export { process_post as default };
//# sourceMappingURL=process.post.mjs.map
