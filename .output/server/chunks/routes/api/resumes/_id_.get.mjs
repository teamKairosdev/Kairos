import { c as defineEventHandler, h as getRouterParam, e as createError } from '../../../_/nitro.mjs';
import { d as db, r as resumes, b as resumeRefinements } from '../../../_/index.mjs';
import { eq } from 'drizzle-orm';
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

const _id__get = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "\uC774\uB825\uC11C ID\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." });
  const [resume] = await db.select().from(resumes).where(eq(resumes.id, id));
  if (!resume) {
    return {
      resume: {
        id,
        title: "\uC2DC\uB2C8\uC5B4 \uD480\uC2A4\uD0DD \uAC1C\uBC1C\uC790 \uC774\uB825\uC11C",
        originalContent: "Nuxt.js \uBC0F TypeScript \uAE30\uBC18 \uC6F9 \uC11C\uBE44\uC2A4 \uACBD\uD5D8 \uBCF4\uC720...",
        status: "improved",
        currentScore: 94,
        createdAt: /* @__PURE__ */ new Date()
      },
      refinementHistory: []
    };
  }
  const refinements = await db.select().from(resumeRefinements).where(eq(resumeRefinements.resumeId, id));
  return {
    resume,
    refinements
  };
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
