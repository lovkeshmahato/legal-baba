import "server-only";

/**
 * In-memory sliding-window rate limiter, keyed per (bucket, identifier).
 * Good enough for a single-instance deploy; on multi-instance/serverless
 * hosting each instance tracks its own counters, so the effective limit is
 * the configured limit × instance count. That's an acceptable trade-off for
 * abuse mitigation (it still caps runaway cost/spam) but isn't a hard
 * guarantee — a real deployment under heavy scale should move this to
 * Redis or similar shared storage.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically drop stale buckets so this doesn't grow unbounded on a
// long-lived process.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  },
  10 * 60 * 1000
).unref?.();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(bucketName: string, identifier: string, limit: number, windowMs: number): RateLimitResult {
  const key = `${bucketName}:${identifier}`;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/** Best-effort client identifier from standard reverse-proxy headers. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
