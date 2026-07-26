import { c as defineEventHandler, r as readBody, e as createError, u as useRuntimeConfig, f as setCookie } from '../../../_/nitro.mjs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { d as db, u as users } from '../../../_/index.mjs';
import { eq } from 'drizzle-orm';
import 'node:crypto';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:async_hooks';
import 'node:fs';
import 'node:url';
import '@iconify/utils';
import 'consola';
import 'node:path';
import 'drizzle-orm/node-postgres';
import 'pg';
import 'drizzle-orm/pg-core';

const login_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password } = body || {};
  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: "\uC774\uBA54\uC77C\uACFC \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694." });
  }
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "\uC774\uBA54\uC77C \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." });
  }
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw createError({ statusCode: 401, statusMessage: "\uC774\uBA54\uC77C \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." });
  }
  const config = useRuntimeConfig();
  const jwtSecret = process.env.JWT_SECRET || config.jwtSecret;
  const token = jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    jwtSecret,
    { expiresIn: "7d" }
  );
  setCookie(event, "kairos_token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60
  });
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl
    },
    token
  };
});

export { login_post as default };
//# sourceMappingURL=login.post.mjs.map
