/**
 * cache.ts — query-hash cache backed by the UserSummary table.
 * Hash inputs: intent JSON, sorted article ids, mode, length.
 */
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type {
  ArticleInput,
  IntentResult,
  SummaryLength,
  SummaryMode,
} from "./types";

export function articleKey(a: ArticleInput): string {
  return a.id && a.id.trim() ? `id:${a.id}` : `url:${a.url}`;
}

export function hashQuery(args: {
  intent?: IntentResult;
  articles: ArticleInput[];
  mode: SummaryMode;
  length: SummaryLength;
}): string {
  const keys = args.articles.map(articleKey).sort();
  const intent = args.intent
    ? {
        topics: args.intent.topics.map((t) => t.slug).sort(),
        outlets: args.intent.outlets.map((o) => o.slug).sort(),
        region: args.intent.region,
        timeframe: args.intent.timeframe,
      }
    : null;
  const payload = JSON.stringify({
    intent,
    keys,
    mode: args.mode,
    length: args.length,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export async function readCachedSummary(queryHash: string): Promise<{
  id: number;
  summaryText: string;
  mode: SummaryMode;
  length: SummaryLength;
} | null> {
  const row = await prisma.userSummary.findUnique({ where: { queryHash } });
  if (!row) return null;
  return {
    id: row.id,
    summaryText: row.summaryText,
    mode: row.mode as SummaryMode,
    length: row.length as SummaryLength,
  };
}

export async function writeCachedSummary(args: {
  queryHash: string;
  summaryText: string;
  mode: SummaryMode;
  length: SummaryLength;
  articles: ArticleInput[];
}): Promise<number> {
  const row = await prisma.userSummary.create({
    data: {
      queryHash: args.queryHash,
      summaryText: args.summaryText,
      mode: args.mode,
      length: args.length,
      articleIds: JSON.stringify(args.articles.map(articleKey)),
    },
  });
  return row.id;
}
