/**
 * deepseek/rate-limit — per-user windows + global daily USD ceiling.
 *
 * Two layers of protection so neither has a hole:
 *   1. Per-user, per-endpoint windows stop a single account from looping
 *      the LLM endpoints.
 *   2. A global daily worst-case USD sum stops total spend even if many
 *      users (or a leaked key) push traffic at once.
 *
 * Both checks read from the LlmCall table, which is written by chatCompletion
 * after each successful (non-stub) DeepSeek call. Stubbed responses are not
 * recorded because they did not cost anything.
 */
import { prisma } from "@/lib/prisma";

export type LlmEndpoint = "ask" | "daily-brief" | "daily-digest" | "briefing";

interface PerUserLimit {
  /** Calls allowed per rolling hour. Omit to skip the hour check. */
  perHour?: number;
  /** Calls allowed per rolling 24h. Omit to skip the day check. */
  perDay?: number;
}

const PER_USER_LIMITS: Record<LlmEndpoint, PerUserLimit | null> = {
  ask: { perHour: 20, perDay: 100 },
  "daily-brief": { perDay: 5 },
  "daily-digest": null, // cron-only; never user-initiated
  briefing: null, // public /briefing page is server-cached for 12h
};

/** Hard global ceiling in worst-case USD per rolling 24h. */
export const GLOBAL_DAILY_USD_CEILING = 2.0;

export type RateLimitReason =
  | "user-hour-exceeded"
  | "user-day-exceeded"
  | "global-day-exceeded";

export interface RateLimitCheck {
  allowed: boolean;
  reason?: RateLimitReason;
  /** Seconds the caller should wait before retrying. */
  retryAfterSec?: number;
  /** Human-readable detail for logs / 429 body. */
  detail?: string;
}

function hourAgo(): Date {
  return new Date(Date.now() - 60 * 60 * 1000);
}

function dayAgo(): Date {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

export async function checkRateLimit(opts: {
  userId: string | null;
  endpoint: LlmEndpoint;
}): Promise<RateLimitCheck> {
  // Global ceiling applies to every call, including cron and the cached
  // /briefing page. Check it first — cheapest single query and the most
  // catastrophic failure mode.
  const globalSince = dayAgo();
  const globalAgg = await prisma.llmCall.aggregate({
    where: { createdAt: { gte: globalSince } },
    _sum: { worstCaseUsd: true },
  });
  const spent = globalAgg._sum.worstCaseUsd ?? 0;
  if (spent >= GLOBAL_DAILY_USD_CEILING) {
    return {
      allowed: false,
      reason: "global-day-exceeded",
      retryAfterSec: 3600,
      detail: `Daily AI budget of $${GLOBAL_DAILY_USD_CEILING.toFixed(2)} reached ($${spent.toFixed(3)} spent). Try again tomorrow.`,
    };
  }

  // Per-user check is endpoint-specific. Skip when the endpoint has no
  // per-user policy (cron, public briefing) or no user identity.
  const policy = PER_USER_LIMITS[opts.endpoint];
  if (policy && opts.userId) {
    if (policy.perHour !== undefined) {
      const count = await prisma.llmCall.count({
        where: {
          userId: opts.userId,
          endpoint: opts.endpoint,
          createdAt: { gte: hourAgo() },
        },
      });
      if (count >= policy.perHour) {
        return {
          allowed: false,
          reason: "user-hour-exceeded",
          retryAfterSec: 60 * 60,
          detail: `You've hit the hourly limit (${policy.perHour}/hour). Try again in an hour.`,
        };
      }
    }
    if (policy.perDay !== undefined) {
      const count = await prisma.llmCall.count({
        where: {
          userId: opts.userId,
          endpoint: opts.endpoint,
          createdAt: { gte: dayAgo() },
        },
      });
      if (count >= policy.perDay) {
        return {
          allowed: false,
          reason: "user-day-exceeded",
          retryAfterSec: 60 * 60 * 6,
          detail: `You've hit the daily limit (${policy.perDay}/day). Try again tomorrow.`,
        };
      }
    }
  }

  return { allowed: true };
}

export async function recordLlmCall(opts: {
  userId: string | null;
  endpoint: LlmEndpoint;
  worstCaseUsd: number;
}): Promise<void> {
  try {
    await prisma.llmCall.create({
      data: {
        userId: opts.userId,
        endpoint: opts.endpoint,
        worstCaseUsd: opts.worstCaseUsd,
      },
    });
  } catch (err) {
    // Don't fail the user's request because we couldn't log the call.
    console.error("[rate-limit] failed to record LlmCall:", err);
  }
}
