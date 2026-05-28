/**
 * /api/cron/daily-digest — fans out brief generation across all users.
 *
 * Protected by a shared secret. Call from Railway Cron with the same value
 * configured as CRON_SECRET in the deploy env. Anyone without the secret
 * gets a 401.
 *
 * Accepts POST (preferred for cron) or GET (handy for one-off manual runs
 * from a browser when you're logged into the same machine that has the env).
 */
import { NextResponse } from "next/server";
import { generateDigestsForAllUsers } from "@/lib/daily-digest";
import { getRequestIp, isIpRateLimited } from "@/lib/rate-limit-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // up to 5 minutes — DeepSeek calls are slow

function authorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false; // refuse if not configured — fail-closed
  const header = req.headers.get("x-cron-secret");
  if (header && header === expected) return true;
  // Also accept ?secret=... for browser-triggered ad-hoc runs.
  const url = new URL(req.url);
  const query = url.searchParams.get("secret");
  return query === expected;
}

async function handle(req: Request) {
  // Even with the shared secret, IP-limit defense in depth in case the
  // secret ever leaks. Generous enough that Railway Cron retries fit.
  const ip = getRequestIp(req);
  if (isIpRateLimited(ip, { scope: "cron/daily-digest", limit: 12, windowMs: 60 * 60 * 1000 })) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const t0 = Date.now();
  const results = await generateDigestsForAllUsers();
  const tookMs = Date.now() - t0;

  const summary = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    ok: true,
    tookMs,
    total: results.length,
    summary,
    results,
  });
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
