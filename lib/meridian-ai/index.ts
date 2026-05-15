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
 * Pre-load both models so the first real request doesn't pay the cold-start cost.
 * Returns elapsed time in ms.
 */
export async function warmup(): Promise<number> {
  const t0 = Date.now();
  await Promise.all([warmupEmbedder(), warmupSummarizer()]);
  return Date.now() - t0;
}
