/**
 * Public entry point for Meridian AI.
 * Routes, scripts, and UI all import from here — keeps internals private.
 */
export { embed, embedMany, warmupEmbedder } from "./embeddings";
export { cosine, dot, norm, topK } from "./similarity";
export { interpretIntent } from "./intent";
export { summarize } from "./summarize";
export { warmupSummarizer } from "./summarize/abstractive";
export {
  hashQuery,
  readCachedSummary,
  writeCachedSummary,
  articleKey,
} from "./cache";
export type {
  Region,
  Timeframe,
  SummaryMode,
  SummaryLength,
  OutletHit,
  TopicHit,
  IntentResult,
  ArticleInput,
  SummaryRequest,
  SummaryResult,
  HistoryItem,
} from "./types";

import { warmupEmbedder } from "./embeddings";
import { warmupSummarizer } from "./summarize/abstractive";

/**
 * Pre-load models so the first real request doesn't pay the cold-start cost.
 * Returns elapsed time in ms.
 *
 * By default only the small (~25MB) embedding model is loaded. Set
 * MERIDIAN_AI_WARM_ABSTRACTIVE=1 to also load the ~88MB distilbart model
 * at boot. On 1GB-RAM hosts (Railway Trial) leave it off and let the
 * abstractive model load lazily on first request.
 */
export async function warmup(): Promise<number> {
  const t0 = Date.now();
  const tasks: Promise<unknown>[] = [warmupEmbedder()];
  if (process.env.MERIDIAN_AI_WARM_ABSTRACTIVE === "1") {
    tasks.push(warmupSummarizer());
  }
  await Promise.all(tasks);
  return Date.now() - t0;
}
