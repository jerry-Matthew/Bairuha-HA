/**
 * Simple in-memory rate limiter
 * For production, consider using Redis-based rate limiting
 */

interface RateLimitOptions {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max unique tokens per interval
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Simple rate limiter
 * In production, use Redis or a dedicated rate limiting service
 */
export default function rateLimit(options: RateLimitOptions) {
  return {
    async check(limit: number, identifier: string): Promise<void> {
      const now = Date.now();
      const record = store[identifier];

      // Clean up expired entries periodically
      if (Math.random() < 0.01) {
        // 1% chance to clean up
        Object.keys(store).forEach((key) => {
          if (store[key].resetTime < now) {
            delete store[key];
          }
        });
      }

      if (!record || record.resetTime < now) {
        // Create new record
        store[identifier] = {
          count: 1,
          resetTime: now + options.interval,
        };
        return;
      }

      if (record.count >= limit) {
        throw new Error("Rate limit exceeded");
      }

      record.count++;
    },
  };
}

