/**
 * GitHub API Rate Limiter
 * 
 * Implements industry-standard rate limiting for GitHub API:
 * - Authenticated: 5,000 requests/hour
 * - Secondary rate limit: 100 requests/minute (CRITICAL)
 * - Respects X-RateLimit-* headers
 * - Exponential backoff with jitter
 */

interface RateLimitState {
    remaining: number;
    reset: number; // Unix timestamp
    used: number;
    limit: number;
}

export class GitHubRateLimiter {
    private rateLimitState: RateLimitState = {
        remaining: 100, // Conservative: assume 100/min secondary limit
        reset: Date.now() + 60000, // Reset in 1 minute
        used: 0,
        limit: 100,
    };
    private requestsInCurrentMinute = 0;
    private minuteWindowStart = Date.now();
    private requestLock = Promise.resolve(); // Serialize requests to prevent race conditions

    /**
     * Update rate limit state from response headers
     */
    updateRateLimitState(headers: Headers): void {
        const remaining = headers.get("X-RateLimit-Remaining");
        const reset = headers.get("X-RateLimit-Reset");
        const used = headers.get("X-RateLimit-Used");
        const limit = headers.get("X-RateLimit-Limit");

        if (remaining) {
            this.rateLimitState.remaining = parseInt(remaining, 10);
        }
        if (reset) {
            this.rateLimitState.reset = parseInt(reset, 10) * 1000; // Convert to milliseconds
        }
        if (used) {
            this.rateLimitState.used = parseInt(used, 10);
        }
        if (limit) {
            this.rateLimitState.limit = parseInt(limit, 10);
        }

        // Track secondary rate limit (100 requests/minute)
        const now = Date.now();
        if (now - this.minuteWindowStart >= 60000) {
            // New minute window
            this.requestsInCurrentMinute = 0;
            this.minuteWindowStart = now;
        }
        this.requestsInCurrentMinute++;
    }

    /**
     * Check if we can make a request now
     */
    private canMakeRequest(): boolean {
        const now = Date.now();

        // Check secondary rate limit (100 requests/minute)
        if (now - this.minuteWindowStart >= 60000) {
            this.requestsInCurrentMinute = 0;
            this.minuteWindowStart = now;
        }

        // Enforce secondary rate limit: max 100 requests per minute
        if (this.requestsInCurrentMinute >= 100) {
            return false;
        }

        // Check primary rate limit
        if (this.rateLimitState.remaining <= 0) {
            return false;
        }

        return true;
    }

    /**
     * Calculate delay before next request
     */
    private calculateDelay(): number {
        const now = Date.now();

        // If we've hit the secondary limit, wait until next minute
        if (this.requestsInCurrentMinute >= 100) {
            const timeUntilNextMinute = 60000 - (now - this.minuteWindowStart);
            return Math.max(timeUntilNextMinute, 1000); // At least 1 second
        }

        // If we've hit the primary limit, wait until reset
        if (this.rateLimitState.remaining <= 0) {
            const timeUntilReset = this.rateLimitState.reset - now;
            return Math.max(timeUntilReset, 1000);
        }

        // Calculate delay to stay under 100 requests/minute
        // Spread requests evenly across the minute: 600ms between requests
        const requestsPerSecond = 100 / 60; // ~1.67 requests/second
        const minDelay = 1000 / requestsPerSecond; // ~600ms
        return minDelay;
    }

    /**
     * Add exponential backoff with jitter
     */
    private exponentialBackoffWithJitter(attempt: number, baseDelay = 1000): number {
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 1000; // Random 0-1000ms
        return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
    }

    /**
     * Execute a request with rate limiting
     * Allows controlled concurrency while respecting rate limits
     */
    async executeRequest<T>(
        requestFn: () => Promise<Response>,
        retries = 2
    ): Promise<Response> {
        // Wait for lock to ensure thread-safe rate limit tracking
        await this.requestLock;

        // Create new lock for this request
        let resolveLock: () => void;
        this.requestLock = new Promise((resolve) => {
            resolveLock = resolve;
        });

        try {
            return await this._executeRequestInternal(requestFn, retries);
        } finally {
            resolveLock!();
        }
    }

    /**
     * Internal request execution with rate limiting
     */
    private async _executeRequestInternal(
        requestFn: () => Promise<Response>,
        retries = 2
    ): Promise<Response> {
        for (let attempt = 0; attempt <= retries; attempt++) {
            // Wait if we can't make a request yet
            while (!this.canMakeRequest()) {
                const delay = this.calculateDelay();
                await new Promise((resolve) => setTimeout(resolve, delay));
            }

            // Increment request counter before making request
            this.requestsInCurrentMinute++;

            try {
                const response = await requestFn();

                // Update rate limit state from headers
                this.updateRateLimitState(response.headers);

                // Handle rate limit response
                if (response.status === 429) {
                    const retryAfter = response.headers.get("Retry-After");
                    if (retryAfter) {
                        const delay = parseInt(retryAfter, 10) * 1000;
                        await new Promise((resolve) => setTimeout(resolve, delay));
                        continue; // Retry after waiting
                    }

                    // If no Retry-After header, use exponential backoff
                    if (attempt < retries) {
                        const delay = this.exponentialBackoffWithJitter(attempt);
                        await new Promise((resolve) => setTimeout(resolve, delay));
                        continue;
                    }
                }

                // Handle other errors
                if (!response.ok && response.status !== 404) {
                    if (attempt < retries) {
                        const delay = this.exponentialBackoffWithJitter(attempt);
                        await new Promise((resolve) => setTimeout(resolve, delay));
                        continue;
                    }
                }

                return response;
            } catch (error: any) {
                // Decrement counter on error (request didn't complete)
                this.requestsInCurrentMinute = Math.max(0, this.requestsInCurrentMinute - 1);

                // Handle network errors
                if (error.code === "ECONNRESET" || error.name === "AbortError") {
                    if (attempt < retries) {
                        const delay = this.exponentialBackoffWithJitter(attempt);
                        await new Promise((resolve) => setTimeout(resolve, delay));
                        continue;
                    }
                }

                // If this is the last attempt, throw
                if (attempt === retries) {
                    throw error;
                }

                // Otherwise, retry with backoff
                const delay = this.exponentialBackoffWithJitter(attempt);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        throw new Error("Max retries exceeded");
    }

    /**
     * Get current rate limit status
     */
    getRateLimitStatus(): RateLimitState {
        return { ...this.rateLimitState };
    }
}

// Singleton instance
export const githubRateLimiter = new GitHubRateLimiter();
