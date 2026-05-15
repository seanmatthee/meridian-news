/**
 * news-bridge — translates an IntentResult into actual articles fetched from
 * the live news layer. Used by /my-world to go from "show me SA market news"
 * to a concrete list of articles to summarize.
 */
import { getAllLanes, type LaneCategory, type NewsItem } from "@/lib/feeds";
import type { ArticleInput, IntentResult, Timeframe } from "./types";

const TIMEFRAME_TO_MS: Record<Timeframe, number> = {
  latest: 6 * 60 * 60 * 1000,
  today: 36 * 60 * 60 * 1000,
  "this-week": 7 * 24 * 60 * 60 * 1000,
  "this-month": 30 * 24 * 60 * 60 * 1000,
};

const CATEGORY_FOR_TOPIC: Record<string, LaneCategory[]> = {
  ai: ["ai"],
  markets: ["finance", "business"],
  business: ["business", "finance"],
  politics: ["world", "south-africa"],
  world: ["world"],
  "south-africa": ["south-africa"],
  tech: ["ai"],
  sport: ["world", "south-africa"],
  science: ["world", "ai"],
  lifestyle: ["world"],
  opinion: ["world", "business"],
  energy: ["business", "south-africa"],
};

export interface SelectOptions {
  maxArticles?: number;
}

function rankArticle(item: NewsItem, intent: IntentResult): number {
  let score = 0;
  // Outlet boost.
  for (const o of intent.outlets) {
    if (o.name === item.source) score += 1.0 + o.score;
  }
  // Category match for topics.
  for (const t of intent.topics) {
    const cats = CATEGORY_FOR_TOPIC[t.slug] ?? [];
    if (cats.includes(item.category)) score += 0.5 + t.score * 0.5;
  }
  // Region match — south-africa lane gets bumped if intent.region == 'south-africa'.
  if (intent.region === "south-africa" && item.category === "south-africa")
    score += 0.4;
  // Recency boost — newer wins ties.
  const ageMs = Date.now() - new Date(item.publishedAt).getTime();
  if (ageMs >= 0) score += Math.max(0, 0.3 - ageMs / (24 * 60 * 60 * 1000) * 0.1);
  return score;
}

export async function selectArticlesForIntent(
  intent: IntentResult,
  opts: SelectOptions = {},
): Promise<ArticleInput[]> {
  const maxArticles = opts.maxArticles ?? 8;
  const lanes = await getAllLanes();
  const all: NewsItem[] = [];
  for (const items of Object.values(lanes)) all.push(...items);

  const cutoff = Date.now() - TIMEFRAME_TO_MS[intent.timeframe];
  const fresh = all.filter(
    (i) => new Date(i.publishedAt).getTime() >= cutoff,
  );
  const pool = fresh.length > 0 ? fresh : all;

  const ranked = pool
    .map((item) => ({ item, score: rankArticle(item, intent) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxArticles)
    .map(({ item }) => item);

  return ranked.map((n) => ({
    title: n.title,
    content: n.description ?? n.title,
    source: n.source,
    url: n.url,
    publishedAt: n.publishedAt,
  }));
}

export async function topHeadlinesAsArticles(
  limit = 12,
): Promise<ArticleInput[]> {
  const lanes = await getAllLanes();
  const all: NewsItem[] = [];
  for (const items of Object.values(lanes)) all.push(...items.slice(0, 4));
  all.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  return all.slice(0, limit).map((n) => ({
    title: n.title,
    content: n.description ?? n.title,
    source: n.source,
    url: n.url,
    publishedAt: n.publishedAt,
  }));
}
