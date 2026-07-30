interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

function getLimits(path: string): { max: number; windowMs: number } {
  const isLLMRoute = path.includes('/refine') ||
    path.includes('/chat') ||
    path.includes('/analyze') ||
    path.includes('/humanize') ||
    path.includes('/generate');

  return isLLMRoute
    ? { max: 10, windowMs: 60_000 }
    : { max: 30, windowMs: 10_000 };
}

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;
  const { max, windowMs } = getLimits(path);

  const ip = getRequestHeader(event, 'x-forwarded-for') ?? '127.0.0.1';
  const now = Date.now();

  let entry = store.get(ip);
  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + windowMs };
    store.set(ip, entry);
  }

  entry.count++;

  const remaining = Math.max(0, max - entry.count);
  setResponseHeader(event, 'X-RateLimit-Limit', max.toString());
  setResponseHeader(event, 'X-RateLimit-Remaining', remaining.toString());

  if (entry.count > max) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Rate limit exceeded',
      headers: { 'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString() },
    });
  }
});
