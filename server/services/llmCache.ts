import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function getCachedResponse(prompt: string, model: string): Promise<string | null> {
  const r = getRedis();
  if (!r) return null;

  try {
    const hash = await sha256(prompt + model);
    return await r.get(`llm:cache:${hash}`);
  } catch {
    return null;
  }
}

export async function setCachedResponse(
  prompt: string,
  model: string,
  response: string,
  ttl: number = 3600
): Promise<void> {
  const r = getRedis();
  if (!r) return;

  try {
    const hash = await sha256(prompt + model);
    await r.set(`llm:cache:${hash}`, response, { ex: ttl });
  } catch {
    // Cache write failure is non-critical
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  const r = getRedis();
  if (!r) return;

  try {
    const keys = await r.keys(`llm:cache:*`);
    if (keys.length > 0) {
      await r.del(...keys);
    }
  } catch {
    // Non-critical
  }
}
