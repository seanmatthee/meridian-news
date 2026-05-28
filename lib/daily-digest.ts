/**
 * daily-digest — generates one user's personalized morning brief.
 *
 * Reuses the My World pipeline (interpretIntent → selectArticlesForIntent →
 * summarizeWithDeepSeek) so the brief reads exactly like an answer the user
 * would get by typing their filter text into My World.
 *
 * Idempotent per (userId, today): DailyBrief has a UNIQUE constraint, so
 * the cron can safely retry without producing duplicates.
 */
import { prisma } from "@/lib/prisma";
import {
  interpretIntent,
  summarizeWithDeepSeek,
} from "@/lib/meridian-ai";
import { selectArticlesForIntent } from "@/lib/meridian-ai/news-bridge";
import { checkRateLimit, type LlmEndpoint } from "@/lib/deepseek/rate-limit";

export interface DigestResult {
  userId: string;
  status:
    | "generated"
    | "skipped-no-filter"
    | "skipped-no-articles"
    | "already-exists"
    | "failed"
    | "rate-limited";
  detail?: string;
}

function todayDateOnly(): Date {
  const now = new Date();
  // Strip time so the unique key always matches a calendar day.
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function generateDigestForUser(opts: {
  userId: string;
  filter: string | null;
  /** Pass true to overwrite an existing brief for today. */
  force?: boolean;
  /**
   * Which entry point asked for this brief. "daily-brief" comes from the
   * user clicking Refresh (capped at 5/day per user). "daily-digest" comes
   * from the cron job (no per-user cap, only the global ceiling).
   */
  endpoint: Extract<LlmEndpoint, "daily-brief" | "daily-digest">;
}): Promise<DigestResult> {
  const filter = (opts.filter ?? "").trim();
  if (!filter) {
    return { userId: opts.userId, status: "skipped-no-filter" };
  }

  const date = todayDateOnly();

  if (!opts.force) {
    const existing = await prisma.dailyBrief.findUnique({
      where: { userId_date: { userId: opts.userId, date } },
    });
    if (existing) {
      return { userId: opts.userId, status: "already-exists" };
    }
  }

  const gate = await checkRateLimit({ userId: opts.userId, endpoint: opts.endpoint });
  if (!gate.allowed) {
    return {
      userId: opts.userId,
      status: "rate-limited",
      detail: gate.detail ?? gate.reason,
    };
  }

  try {
    const intent = await interpretIntent(filter);
    const articles = await selectArticlesForIntent(intent, { maxArticles: 12 });
    if (articles.length === 0) {
      return {
        userId: opts.userId,
        status: "skipped-no-articles",
        detail: "Intent classifier returned no matching articles for the filter.",
      };
    }

    const result = await summarizeWithDeepSeek({
      question: filter,
      articles,
      intent,
      userId: opts.userId,
      endpoint: opts.endpoint,
    });

    if (!result.summary.trim() || result.stub) {
      return {
        userId: opts.userId,
        status: "failed",
        detail: result.stub ? "DeepSeek returned a stub response." : "Empty summary.",
      };
    }

    await prisma.dailyBrief.upsert({
      where: { userId_date: { userId: opts.userId, date } },
      create: {
        userId: opts.userId,
        date,
        filterText: filter,
        summary: result.summary,
      },
      update: {
        filterText: filter,
        summary: result.summary,
        createdAt: new Date(),
      },
    });

    return { userId: opts.userId, status: "generated" };
  } catch (err) {
    console.error(`[daily-digest] user ${opts.userId} failed:`, err);
    return {
      userId: opts.userId,
      status: "failed",
      detail: String((err as Error).message ?? err),
    };
  }
}

export async function generateDigestsForAllUsers(): Promise<DigestResult[]> {
  const users = await prisma.user.findMany({
    where: { filter: { not: null } },
    select: { id: true, filter: true },
  });

  const results: DigestResult[] = [];
  // Sequential, not parallel — the LLM call is heavy and Railway's CPU is
  // modest. Parallelizing risks rate limits and tail-latency spikes.
  for (const u of users) {
    const res = await generateDigestForUser({
      userId: u.id,
      filter: u.filter,
      endpoint: "daily-digest",
    });
    results.push(res);
  }
  return results;
}
