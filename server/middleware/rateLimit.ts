import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

function createRatelimit() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  return {
    general: new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(30, '10 s'),
      analytics: true,
    }),
    llm: new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      analytics: true,
    }),
  };
}

const ratelimiter = createRatelimit();

export default defineEventHandler(async (event) => {
  if (!ratelimiter) return;

  const path = getRequestURL(event).pathname;

  const isLLMRoute = path.includes('/refine') ||
    path.includes('/chat') ||
    path.includes('/analyze') ||
    path.includes('/humanize') ||
    path.includes('/generate');

  const limiter = isLLMRoute ? ratelimiter.llm : ratelimiter.general;

  const ip = getRequestHeader(event, 'x-forwarded-for') ?? '127.0.0.1';
  const { success, limit, remaining, reset } = await limiter.limit(ip);

  setResponseHeader(event, 'X-RateLimit-Limit', limit.toString());
  setResponseHeader(event, 'X-RateLimit-Remaining', remaining.toString());

  if (!success) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Rate limit exceeded',
      headers: { 'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString() },
    });
  }
});
