import { c as defineEventHandler, r as readBody, e as createError } from '../../_/nitro.mjs';
import { createCareerEntry } from 'server/services/career';
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

const index_post = defineEventHandler(async (event) => {
  var _a;
  const body = await readBody(event);
  const { company, role, period, description, achievements } = body || {};
  if (!company || !role || !description) {
    throw createError({ statusCode: 400, statusMessage: "\uD68C\uC0AC\uBA85, \uC9C1\uBB34, \uC8FC\uC694 \uC124\uBA85\uC740 \uD544\uC218 \uC785\uB825 \uD56D\uBAA9\uC785\uB2C8\uB2E4." });
  }
  const userId = ((_a = event.context.user) == null ? void 0 : _a.userId) || "00000000-0000-0000-0000-000000000000";
  const newEntry = await createCareerEntry({
    userId,
    company,
    role,
    period: period || "\uAE30\uD0C0",
    description,
    achievements: achievements || []
  });
  return newEntry;
});

export { index_post as default };
//# sourceMappingURL=index.post.mjs.map
