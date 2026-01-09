import type { NextApiRequest, NextApiResponse } from 'next';
import { LRUCache } from 'lru-cache';
import { apiResponse } from '@/lib/api';

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  keyPrefix: string;
};

const tokenCache = new LRUCache<string, { tokens: number; last: number }>({
  max: 500,
});

const getKey = (req: NextApiRequest, prefix: string) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? req.socket.remoteAddress ?? 'unknown';
  return `${prefix}:${ip}`;
};

export const enforceRateLimit = async (
  req: NextApiRequest,
  res: NextApiResponse,
  { limit, windowMs, keyPrefix }: RateLimitOptions,
) => {
  try {
    const key = getKey(req, keyPrefix);
    const now = Date.now();
    const entry = tokenCache.get(key) ?? { tokens: limit, last: now };

    const elapsed = now - entry.last;
    const refill = Math.floor(elapsed / windowMs) * limit;
    entry.tokens = Math.min(limit, entry.tokens + refill);
    entry.last = now;

    if (entry.tokens > 0) {
      entry.tokens -= 1;
      tokenCache.set(key, entry);
      return true;
    }

    tokenCache.set(key, entry);
    apiResponse.error(res, 429, 'Too many requests. Please slow down.');
    return false;
  } catch (error) {
    // If rate limiting fails (e.g., cache error), log but allow request
    // This prevents rate limiting from breaking the application
    console.error('[RateLimit] Error enforcing rate limit:', error);
    return true; // Fail open to prevent service disruption
  }
};

