/**
 * summarize — generates the My World answer via DeepSeek and caches the
 * result against a hash of (question + article ids).
 */
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { readCachedSummary, writeCachedSummary, articleKey } from "./cache";
import type { ArticleInput, IntentResult } from "./types";
import { answerNewsQuery } from "@/lib/deepseek/analyze";

interface DeepSeekSummarizeRequest {
  question: string;
  articles: ArticleInput[];
  intent?: IntentResult;
  sessionId?: string;
  queryId?: number;
}

interface DeepSeekSummarizeResult {
  summary: string;
  sourceArticles: Array<{ title: string; url: string; source: string }>;
  cached: boolean;
  stub: boolean;
}

function hashWithQuestion(args: {
  question: string;
  articles: ArticleInput[];
  intent?: IntentResult;
}): string {
  const keys = args.articles.map(articleKey).sort();
  const payload = JSON.stringify({
    q: args.question.toLowerCase().trim(),
    keys,
    region: args.intent?.region ?? null,
    timeframe: args.intent?.timeframe ?? null,
    provider: "deepseek-v1",
  });
  return createHash("sha256").update(payload).digest("hex");
}

export async function summarizeWithDeepSeek(
  req: DeepSeekSummarizeRequest,
): Promise<DeepSeekSummarizeResult> {
  if (!req.articles || req.articles.length === 0) {
    throw new Error("no-articles");
  }

  const queryHash = hashWithQuestion({
    question: req.question,
    articles: req.articles,
    intent: req.intent,
  });

  const cached = await readCachedSummary(queryHash);
  if (cached) {
    if (req.queryId !== undefined) {
      await prisma.userQuery.update({
        where: { id: req.queryId },
        data: { summaryId: cached.id },
      });
    }
    return {
      summary: cached.summaryText,
      sourceArticles: req.articles.map((a) => ({
        title: a.title,
        url: a.url,
        source: a.source,
      })),
      cached: true,
      stub: false,
    };
  }

  const { text, stub } = await answerNewsQuery({
    question: req.question,
    articles: req.articles,
  });

  if (!text.trim()) throw new Error("deepseek-empty");

  // Don't cache stubbed responses — they aren't real answers.
  if (!stub) {
    const id = await writeCachedSummary({
      queryHash,
      summaryText: text,
      mode: "abstractive",
      length: "medium",
      articles: req.articles,
    });
    if (req.queryId !== undefined) {
      await prisma.userQuery.update({
        where: { id: req.queryId },
        data: { summaryId: id },
      });
    }
  }

  return {
    summary: text,
    sourceArticles: req.articles.map((a) => ({
      title: a.title,
      url: a.url,
      source: a.source,
    })),
    cached: false,
    stub,
  };
}
