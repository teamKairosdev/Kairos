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

const register_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password, name } = body || {};
  if (!email || !password || !name) {
    throw createError({ statusCode: 400, statusMessage: "\uC774\uBA54\uC77C, \uBE44\uBC00\uBC88\uD638, \uC774\uB984\uC744 \uBAA8\uB450 \uC785\uB825\uD574\uC57C \uD569\uB2C8\uB2E4." });
  }
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: "\uC774\uBBF8 \uAC00\uC785\uB41C \uC774\uBA54\uC77C \uC8FC\uC18C\uC785\uB2C8\uB2E4." });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [newUser] = await db.insert(users).values({
    email,
    passwordHash,
    name,
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`
  }).returning();
  const config = useRuntimeConfig();
  const jwtSecret = process.env.JWT_SECRET || config.jwtSecret;
  const token = jwt.sign(
    { userId: newUser.id, email: newUser.email, name: newUser.name },
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
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      avatarUrl: newUser.avatarUrl
    },
    token
  };
});

export { register_post as default };
//# sourceMappingURL=register.post.mjs.map
