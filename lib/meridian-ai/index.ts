/**
 * Public entry point for Meridian AI.
 * Routes import from here so internals stay private.
 *
 * Embeddings + intent classification still run locally via transformers.js.
 * Summarization is delegated to DeepSeek (see ./summarize.ts).
 */
export { embed, embedMany, warmupEmbedder } from "./embeddings";
export { cosine, dot, norm, topK } from "./similarity";
export { interpretIntent } from "./intent";
export { preflightScopeCheck, postIntentScopeCheck } from "./scope-guard";
export type { ScopeDecision } from "./scope-guard";
export { summarizeWithDeepSeek } from "./summarize";
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
