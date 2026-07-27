import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let generalLimiter: Ratelimit | null = null;
let llmLimiter: Ratelimit | null = null;

function getLimiters() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return { general: null, llm: null };

  if (!generalLimiter) {
    generalLimiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(30, '10 s'),
      analytics: true,
    });
  }

  if (!llmLimiter) {
    llmLimiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      analytics: true,
    });
  }

  return { general: generalLimiter, llm: llmLimiter };
}

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;

  // Skip rate limiting for public routes
  if (path.startsWith('/_nuxt') || path.startsWith('/__nuxt') || path === '/' || path.startsWith('/auth')) {
    return;
  }

  const { general, llm } = getLimiters();
  if (!general) return; // No Redis configured, skip

  const isLLMRoute = path.includes('/refine') ||
    path.includes('/chat') ||
    path.includes('/analyze') ||
    path.includes('/humanize') ||
    path.includes('/generate');

  const limiter = isLLMRoute ? llm : general;
  if (!limiter) return;

  const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || getRequestHeader(event, 'x-real-ip')
    || '127.0.0.1';

  const { success, limit, remaining, reset } = await limiter.limit(ip);

  setResponseHeader(event, 'X-RateLimit-Limit', limit.toString());
  setResponseHeader(event, 'X-RateLimit-Remaining', remaining.toString());

  if (!success) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests',
      headers: { 'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString() },
    });
  }
});
