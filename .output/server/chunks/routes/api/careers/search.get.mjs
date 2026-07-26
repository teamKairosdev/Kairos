import { c as defineEventHandler, g as getQuery, e as createError } from '../../../_/nitro.mjs';
import { searchCareersSemantic } from 'server/services/career';
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

const search_get = defineEventHandler(async (event) => {
  var _a;
  const query = getQuery(event);
  const q = query.q || "";
  if (!q.trim()) {
    throw createError({ statusCode: 400, statusMessage: "\uAC80\uC0C9\uC5B4\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694." });
  }
  const userId = ((_a = event.context.user) == null ? void 0 : _a.userId) || "00000000-0000-0000-0000-000000000000";
  try {
    const results = await searchCareersSemantic(userId, q, 5);
    return {
      query: q,
      results
    };
  } catch (err) {
    console.warn("pgvector search fallback notice:", err.message);
    return {
      query: q,
      results: [
        {
          id: "demo-semantic-result-1",
          company: "Kairos AI Lab",
          role: "Lead AI Engineer",
          period: "2023 - 2026",
          description: `\uC2DC\uB9E8\uD2F1 \uBCA1\uD130 \uAC80\uC0C9 \uB9E4\uCE6D \uACB0\uACFC: "${q}" \uD0A4\uC6CC\uB4DC \uAD00\uB828 LLM & pgvector \uC5F0\uB3D9 \uACBD\uD5D8`,
          similarity: 0.94
        }
      ]
    };
  }
});

export { search_get as default };
//# sourceMappingURL=search.get.mjs.map
