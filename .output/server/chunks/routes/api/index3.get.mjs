import { c as defineEventHandler } from '../../_/nitro.mjs';
import { d as db, r as resumes } from '../../_/index.mjs';
import { eq, desc } from 'drizzle-orm';
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

const index_get = defineEventHandler(async (event) => {
  var _a;
  const userId = (_a = event.context.user) == null ? void 0 : _a.userId;
  if (!userId) {
    return [
      {
        id: "demo-resume-1",
        title: "\uC2DC\uB2C8\uC5B4 \uD480\uC2A4\uD0DD \uAC1C\uBC1C\uC790 \uC774\uB825\uC11C \uCD08\uC548",
        originalContent: "Nuxt.js \uBC0F Node.js \uAE30\uBC18 \uC6F9 \uC11C\uBE44\uC2A4 \uAD6C\uCD95 \uACBD\uB825 4\uB144...",
        status: "improved",
        currentScore: 92,
        createdAt: /* @__PURE__ */ new Date()
      }
    ];
  }
  const list = await db.select().from(resumes).where(eq(resumes.userId, userId)).orderBy(desc(resumes.createdAt));
  return list;
});

export { index_get as default };
//# sourceMappingURL=index3.get.mjs.map
