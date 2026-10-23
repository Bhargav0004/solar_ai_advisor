/**
 * SolarAI - In-memory IP-based rate limiter
 * ===============================================================
 * Sliding-window counter per key (typically IP + route-group).
 *
 * NOTE: This is per-process in-memory state. In a multi-instance
 * deployment you'd back this with Redis or similar. For the
 * single-instance sandbox this is sufficient and dependency-free.
 */

import { SOLAR_CONFIG } from "@/lib/solar/config";

interface Bucket {
  hits: number[]; // timestamps of recent hits
}

const buckets = new Map<string, Bucket>();

// Periodic cleanup of stale buckets to prevent unbounded memory growth.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const cutoff = now - 2 * SOLAR_CONFIG.RATE_LIMIT.WINDOW_MS;
  for (const [key, bucket] of buckets.entries()) {
    const fresh = bucket.hits.filter((t) => t > cutoff);
    if (fresh.length === 0) {
      buckets.delete(key);
    } else {
      bucket.hits = fresh;
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Ms until the oldest hit in the current window expires (when retry becomes possible). */
  resetMs: number;
}

/**
 * Check whether a request from `key` is allowed under the limit `max`
 * requests per `windowMs`. If allowed, the hit is recorded.
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number = SOLAR_CONFIG.RATE_LIMIT.WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const windowStart = now - windowMs;
  const bucket = buckets.get(key) ?? { hits: [] };
  const recent = bucket.hits.filter((t) => t > windowStart);

  if (recent.length >= max) {
    const oldest = recent[0];
    const resetMs = Math.max(oldest + windowMs - now, 0);
    bucket.hits = recent;
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0, resetMs };
  }

  recent.push(now);
  bucket.hits = recent;
  buckets.set(key, bucket);
  return { allowed: true, remaining: Math.max(max - recent.length, 0), resetMs: windowMs };
}
