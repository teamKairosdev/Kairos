/**
 * LLM response cache ported from server/services/llmCache.ts (pure in-memory, no Nuxt APIs)
 */

interface CacheEntry {
  data: string;
  expires: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(prompt: string, model: string): string {
  return `llm:cache:${model}:${prompt}`;
}

export async function getCachedResponse(prompt: string, model: string): Promise<string | null> {
  try {
    const key = cacheKey(prompt, model);
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      cache.delete(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export async function setCachedResponse(
  prompt: string,
  model: string,
  response: string,
  ttl = 3600
): Promise<void> {
  try {
    const key = cacheKey(prompt, model);
    cache.set(key, { data: response, expires: Date.now() + ttl * 1000 });
  } catch {}
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) cache.delete(key);
    }
  } catch {}
}

export function resetCache(): void {
  cache.clear();
}
