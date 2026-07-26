import { c as defineEventHandler, h as getRouterParam, e as createError } from '../../../../_/nitro.mjs';
import { executeResumeRefinementChain } from 'server/services/resume';
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

const refine_post = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Resume ID is required" });
  try {
    const result = await executeResumeRefinementChain(id);
    return {
      success: true,
      message: "\uC774\uB825\uC11C \uD3C9\uAC00 \uBC0F \uAC1C\uC120 \uBE44\uB3D9\uAE30 \uD30C\uC774\uD504\uB77C\uC778\uC774 \uC131\uACF5\uC801\uC73C\uB85C \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
      result
    };
  } catch (err) {
    throw createError({ statusCode: 500, statusMessage: err.message || "Refinement pipeline error" });
  }
});

export { refine_post as default };
//# sourceMappingURL=refine.post.mjs.map
