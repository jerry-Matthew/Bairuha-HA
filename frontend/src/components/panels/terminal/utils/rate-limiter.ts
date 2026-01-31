/**
 * Rate Limiter
 * 
 * Prevents command execution abuse by limiting commands per time window.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const MAX_COMMANDS_PER_WINDOW = 50;
const WINDOW_DURATION_MS = 60000; // 1 minute

/**
 * Check if command execution is allowed for a user
 * Uses sliding window rate limiting
 */
export function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  // Clean up expired entries
  if (entry && entry.resetTime <= now) {
    rateLimitStore.delete(userId);
  }

  // Get or create entry
  const currentEntry = rateLimitStore.get(userId) || {
    count: 0,
    resetTime: now + WINDOW_DURATION_MS,
  };

  // Check if limit exceeded
  if (currentEntry.count >= MAX_COMMANDS_PER_WINDOW) {
    const retryAfter = Math.ceil((currentEntry.resetTime - now) / 1000);
    return {
      allowed: false,
      retryAfter,
    };
  }

  // Increment count
  currentEntry.count++;
  rateLimitStore.set(userId, currentEntry);

  return { allowed: true };
}

/**
 * Reset rate limit for a user (useful for testing or manual reset)
 */
export function resetRateLimit(userId: string): void {
  rateLimitStore.delete(userId);
}
