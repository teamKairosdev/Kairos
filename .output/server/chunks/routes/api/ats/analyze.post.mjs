import { c as defineEventHandler, r as readBody, e as createError } from '../../../_/nitro.mjs';
import { analyzeATSCompatibility } from 'server/services/ats';
import { d as db, a as atsAnalyses } from '../../../_/index.mjs';
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

const analyze_post = defineEventHandler(async (event) => {
  var _a;
  const body = await readBody(event);
  const { jobTitle, jobDescription, resumeText, resumeId } = body || {};
  if (!jobTitle || !jobDescription || !resumeText) {
    throw createError({
      statusCode: 400,
      statusMessage: "\uC9C1\uBB34\uBA85, \uCC44\uC6A9\uACF5\uACE0 \uBCF8\uBB38, \uC774\uB825\uC11C \uD14D\uC2A4\uD2B8\uAC00 \uBAA8\uB450 \uD544\uC694\uD569\uB2C8\uB2E4."
    });
  }
  const userId = ((_a = event.context.user) == null ? void 0 : _a.userId) || "00000000-0000-0000-0000-000000000000";
  const analysis = await analyzeATSCompatibility(resumeText, jobDescription);
  const [saved] = await db.insert(atsAnalyses).values({
    userId,
    jobTitle,
    jobDescription,
    resumeId: resumeId || null,
    matchScore: analysis.matchScore,
    missingKeywords: analysis.missingKeywords,
    foundKeywords: analysis.foundKeywords,
    recommendations: analysis.recommendations,
    detailedBreakdown: analysis.detailedBreakdown
  }).returning();
  return {
    id: saved.id,
    analysis
  };
});

export { analyze_post as default };
//# sourceMappingURL=analyze.post.mjs.map
