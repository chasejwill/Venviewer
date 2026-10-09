const WINDOW_MS = 60_000;
const MAX_EVENTS = 60;

type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export function checkAnalyticsRateLimit(
  key: string,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= MAX_EVENTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetAnalyticsRateLimitForTests(): void {
  buckets.clear();
}
