/**
 * Rate limiting middleware for Next.js API routes.
 * Ported from server/middleware/rateLimit.ts (Nitro H3 → Next.js utility function).
 */

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

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  headers: Record<string, string>;
}

export function checkRateLimit(ip: string, path: string): RateLimitResult {
  const { max, windowMs } = getLimits(path);
  const now = Date.now();

  let entry = store.get(ip);
  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + windowMs };
    store.set(ip, entry);
  }

  entry.count++;

  const remaining = Math.max(0, max - entry.count);
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': max.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
  };

  if (entry.count > max) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    headers['Retry-After'] = retryAfter.toString();
    return { allowed: false, remaining: 0, retryAfter, headers };
  }

  return { allowed: true, remaining, headers };
}
