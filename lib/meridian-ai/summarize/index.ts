/**
 * summarize — dispatcher for the two summarization strategies.
 *
 * - Validates input.
 * - Looks up the query-hash cache.
 * - Calls the chosen strategy.
 * - Writes back to cache.
 * - Persists the resulting summary id onto the UserQuery row when sessionId/queryId are provided.
 */
import { prisma } from "@/lib/prisma";
import {
  hashQuery,
  readCachedSummary,
  writeCachedSummary,
} from "../cache";
import type {
  ArticleInput,
  SummaryRequest,
  SummaryResult,
} from "../types";
import { summarizeExtractive } from "./extractive";
import { summarizeAbstractive } from "./abstractive";

function isValidArticle(a: ArticleInput): boolean {
  return Boolean(
    a &&
      typeof a.title === "string" &&
      a.title.trim() &&
      typeof a.url === "string" &&
      a.url.trim() &&
      typeof a.source === "string" &&
      a.source.trim() &&
      typeof a.content === "string" &&
      a.content.trim().length >= 20,
  );
}

export async function summarize(req: SummaryRequest): Promise<SummaryResult> {
  const articles = (req.articles ?? []).filter(isValidArticle);
  if (articles.length === 0) {
    const err = new Error("no-valid-articles");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const queryHash = hashQuery({
    intent: req.intent,
    articles,
    mode: req.mode,
    length: req.length,
  });

  // Cache hit short-circuit.
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
      sourceArticles: articles.map((a) => ({
        title: a.title,
        url: a.url,
        source: a.source,
      })),
      mode: cached.mode,
      length: cached.length,
      cached: true,
    };
  }

  // Compute.
  const summaryText =
    req.mode === "abstractive"
      ? await summarizeAbstractive(articles, req.length)
      : await summarizeExtractive(articles, req.length);

  if (!summaryText.trim()) {
    throw new Error("[meridian-ai] summarize produced empty result");
  }

  const id = await writeCachedSummary({
    queryHash,
    summaryText,
    mode: req.mode,
    length: req.length,
    articles,
  });

  if (req.queryId !== undefined) {
    await prisma.userQuery.update({
      where: { id: req.queryId },
      data: { summaryId: id },
    });
  }

  return {
    summary: summaryText,
    sourceArticles: articles.map((a) => ({
      title: a.title,
      url: a.url,
      source: a.source,
    })),
    mode: req.mode,
    length: req.length,
    cached: false,
  };
}
