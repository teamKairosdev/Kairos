import { c as defineEventHandler, i as readMultipartFormData, e as createError } from '../../../_/nitro.mjs';
import { parseDocumentText } from 'server/services/parser';
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

const parse_post = defineEventHandler(async (event) => {
  const files = await readMultipartFormData(event);
  if (!files || files.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "\uC5C5\uB85C\uB4DC\uD560 \uD30C\uC77C\uC774 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." });
  }
  const file = files[0];
  const extractedText = await parseDocumentText(file.data, file.type || "", file.filename || "resume.pdf");
  return {
    filename: file.filename,
    extractedText,
    charCount: extractedText.length
  };
});

export { parse_post as default };
//# sourceMappingURL=parse.post.mjs.map
