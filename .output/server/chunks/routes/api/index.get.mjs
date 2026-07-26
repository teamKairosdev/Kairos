import { c as defineEventHandler } from '../../_/nitro.mjs';
import { d as db, c as careers } from '../../_/index.mjs';
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
        id: "demo-career-1",
        company: "Kairos Tech Inc.",
        role: "Lead Full-Stack Architect",
        period: "2023.01 - \uC7AC\uC9C1\uC911",
        description: "Nuxt 4 \uBC0F pgvector \uAE30\uBC18 AI \uCEE4\uB9AC\uC5B4 \uC5D0\uC774\uC804\uD2B8 \uC2DC\uC2A4\uD15C \uC804\uCCB4 \uC544\uD0A4\uD14D\uCC98 \uC124\uACC4 \uBC0F \uAD6C\uCD95",
        achievements: ["Vercel AI SDK \uC5F0\uB3D9\uC73C\uB85C 99.9% LLM \uC548\uC815\uC131 \uB2EC\uC131", "pgvector \uC2DC\uB9E8\uD2F1 \uAC80\uC0C9 \uC5D4\uC9C4 \uB3C4\uC785"],
        createdAt: /* @__PURE__ */ new Date()
      }
    ];
  }
  return await db.select().from(careers).where(eq(careers.userId, userId)).orderBy(desc(careers.createdAt));
});

export { index_get as default };
//# sourceMappingURL=index.get.mjs.map
