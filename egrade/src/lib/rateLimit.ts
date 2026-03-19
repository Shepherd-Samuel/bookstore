// Simple in-memory rate limiter for client-side form submissions
const attempts = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limit an action by key. Returns true if allowed, false if rate-limited.
 * @param key Unique key for the action (e.g., "login", "transfer-initiate")
 * @param maxAttempts Max attempts allowed in the window
 * @param windowMs Time window in milliseconds (default 60s)
 */
export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Get remaining seconds until rate limit resets
 */
export function getRateLimitReset(key: string): number {
  const entry = attempts.get(key);
  if (!entry) return 0;
  const remaining = Math.ceil((entry.resetAt - Date.now()) / 1000);
  return Math.max(0, remaining);
}

/**
 * Wrapper that throws if rate-limited
 */
export function enforceRateLimit(key: string, maxAttempts = 5, windowMs = 60_000): void {
  if (!checkRateLimit(key, maxAttempts, windowMs)) {
    const secs = getRateLimitReset(key);
    throw new Error(`Too many attempts. Please wait ${secs} seconds before trying again.`);
  }
}
