/**
 * rate-limit-ip — process-local IP rate limiter shared by every route handler.
 *
 * Each entry is scoped to (endpoint, ip) so different routes have independent
 * quotas. Memory is bounded by a periodic prune that runs only when the map
 * is full, keeping the common path branch-free.
 *
 * Single-instance assumption: Meridian runs on one Railway instance today, so
 * a per-process Map is sufficient. If we ever scale horizontally, this will
 * need to move to Redis (or sticky-session routing) — otherwise each replica
 * carries its own quota and an attacker gets `limit × replicas` requests.
 */

interface RateEntry {
  count: number;
  resetAt: number;
}

const STORE = new Map<string, RateEntry>();

/** Hard cap on entries before a sweep is forced. ~50k IPs * ~32 bytes ≈ 1.6 MB. */
const MAX_ENTRIES = 50_000;

export function getRequestIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

export interface RateLimitOptions {
  /** Logical bucket so endpoints don't share quotas. */
  scope: string;
  /** Max requests per IP within the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/**
 * Returns true if the IP has exceeded the limit for the given scope.
 * Increments the counter on every non-blocked call.
 */
export function isIpRateLimited(ip: string, opts: RateLimitOptions): boolean {
  pruneIfFull();
  const key = `${opts.scope}|${ip}`;
  const now = Date.now();
  const entry = STORE.get(key);
  if (!entry || now > entry.resetAt) {
    STORE.set(key, { count: 1, resetAt: now + opts.windowMs });
    return false;
  }
  if (entry.count >= opts.limit) return true;
  entry.count++;
  return false;
}

function pruneIfFull(): void {
  if (STORE.size < MAX_ENTRIES) return;
  const now = Date.now();
  for (const [k, v] of STORE) {
    if (v.resetAt <= now) STORE.delete(k);
  }
}
