import { c as defineEventHandler } from '../../../_/nitro.mjs';
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
import 'jsonwebtoken';
import '@iconify/utils';
import 'consola';
import 'node:path';
import 'drizzle-orm/node-postgres';
import 'pg';
import 'drizzle-orm/pg-core';

const me_get = defineEventHandler(async (event) => {
  const authUser = event.context.user;
  if (!authUser) {
    return {
      authenticated: false,
      user: {
        id: "guest-demo-user",
        email: "guest@kairos.ai",
        name: "Guest Steward",
        avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=KairosGuest"
      }
    };
  }
  const [dbUser] = await db.select().from(users).where(eq(users.id, authUser.userId));
  return {
    authenticated: true,
    user: dbUser ? {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      avatarUrl: dbUser.avatarUrl
    } : authUser
  };
});

export { me_get as default };
//# sourceMappingURL=me.get.mjs.map
