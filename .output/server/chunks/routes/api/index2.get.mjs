import { c as defineEventHandler } from '../../_/nitro.mjs';
import { d as db, m as mockInterviews } from '../../_/index.mjs';
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
        id: "demo-interview-1",
        jobTitle: "Senior Frontend Engineer",
        companyName: "Kairos Labs",
        difficulty: "medium",
        status: "completed",
        overallScore: 88,
        createdAt: /* @__PURE__ */ new Date()
      }
    ];
  }
  return await db.select().from(mockInterviews).where(eq(mockInterviews.userId, userId)).orderBy(desc(mockInterviews.createdAt));
});

export { index_get as default };
//# sourceMappingURL=index2.get.mjs.map
