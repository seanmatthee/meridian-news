/**
 * fetch.ts — Browser-emulating fetch helper.
 * Many news sites and finance APIs reject the default Node fetch User-Agent.
 */

// ─── BROWSER-HEADERS FETCH ─────────────────────────────────────

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/rss+xml, application/xml, application/json, text/xml, */*",
  "Accept-Language": "en-US,en;q=0.9",
};

interface BrowserFetchInit extends RequestInit {
  revalidate?: number;
}

/**
 * Enhanced fetch that includes realistic browser headers and Next.js revalidation.
 */
export async function fetchWithBrowserHeaders(
  url: string,
  init?: BrowserFetchInit
): Promise<Response> {
  const { revalidate, headers, ...rest } = init ?? {};
  
  // Combine default browser headers with any overrides
  const combinedHeaders = {
    ...BROWSER_HEADERS,
    ...((headers as Record<string, string> | undefined) ?? {}),
  };

  return fetch(url, {
    ...rest,
    headers: combinedHeaders,
    next: revalidate ? { revalidate } : undefined,
  });
}

// ─── STALE FALLBACK CACHE ──────────────────────────────────────

type CacheEntry<T> = { data: T; at: number };
const lastGood = new Map<string, CacheEntry<unknown>>();

const SIX_HOURS_MS = 1000 * 60 * 60 * 6;

/**
 * Retrieves the last successful payload for a given key if it's within the max age.
 */
export function getLastGood<T>(key: string, maxAgeMs = SIX_HOURS_MS): T | null {
  const entry = lastGood.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > maxAgeMs) return null;
  return entry.data as T;
}

/**
 * Stores a successful payload in the stale fallback cache.
 */
export function setLastGood<T>(key: string, data: T): void {
  lastGood.set(key, { data, at: Date.now() });
}
