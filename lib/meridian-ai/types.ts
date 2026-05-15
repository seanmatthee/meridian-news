/**
 * Shared types for Meridian AI.
 * Mirrors the contract in docs/meridian-ai.md §2 + §5.
 */

export type Region =
  | "global"
  | "south-africa"
  | "africa"
  | "europe"
  | "us"
  | "asia";

export type Timeframe = "today" | "this-week" | "this-month" | "latest";

export type SummaryMode = "extractive" | "abstractive";
export type SummaryLength = "short" | "medium" | "long";

export interface OutletHit {
  id: number;
  name: string;
  slug: string;
  category: string;
  region: string;
  score: number;
}

export interface TopicHit {
  id: number;
  name: string;
  slug: string;
  score: number;
}

export interface IntentResult {
  outlets: OutletHit[];
  topics: TopicHit[];
  region: Region;
  timeframe: Timeframe;
  confidence: number;
}

export interface ArticleInput {
  /** Optional persisted id; if absent, the article is treated as in-memory. */
  id?: string;
  title: string;
  content: string;
  source: string;
  url: string;
  publishedAt?: string;
}

export interface SummaryRequest {
  articleIds?: string[];
  articles?: ArticleInput[];
  mode: SummaryMode;
  length: SummaryLength;
  /** Optional intent JSON; folded into the cache key when present. */
  intent?: IntentResult;
  /** Used to associate the resulting summary with a user query row. */
  sessionId?: string;
  queryId?: number;
}

export interface SummaryResult {
  summary: string;
  sourceArticles: Array<{ title: string; url: string; source: string }>;
  mode: SummaryMode;
  length: SummaryLength;
  cached: boolean;
}

export interface HistoryItem {
  queryId: number;
  rawText: string;
  intent: IntentResult | null;
  summary: string | null;
  mode: SummaryMode | null;
  createdAt: string;
}
