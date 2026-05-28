/**
 * briefing.ts — daily editorial briefing, powered by DeepSeek.
 *
 * Cached for 12h via unstable_cache, so the LLM runs at most twice a day
 * regardless of traffic. Falls back to a headline-list briefing if the
 * LLM is unavailable or returns empty content.
 */
import { unstable_cache } from "next/cache";
import { getTopHeadlines, type NewsItem } from "./feeds";
import type { ArticleInput } from "./meridian-ai";
import { composeBriefing, type BriefingLane } from "./deepseek/analyze";
import { isDeepSeekConfigured } from "./deepseek/client";

export interface BriefingData {
  content: string;
  generatedAt: string;
  headlineCount: number;
}

const LANE_HEADINGS: Array<{ category: NewsItem["category"]; heading: string }> = [
  { category: "world", heading: "Across the wires" },
  { category: "business", heading: "On the business desk" },
  { category: "finance", heading: "In the markets" },
  { category: "ai", heading: "Inside AI and tech" },
  { category: "south-africa", heading: "From South Africa" },
];

function headlinesToArticles(headlines: NewsItem[]): ArticleInput[] {
  return headlines.map((h) => ({
    title: h.title,
    content: h.description ?? h.title,
    source: h.source,
    url: h.url,
    publishedAt: h.publishedAt,
  }));
}

function focusBullet(item: NewsItem): string {
  const title = item.title.replace(/\.+$/, "").trim();
  return `${title} (${item.source}).`;
}

/**
 * Build the editorial briefing via DeepSeek. The system prompt locks the
 * output format that Briefing.tsx parses (numbered bold-led paragraphs,
 * then "Today's focus" with bullet items).
 */
async function buildBriefingContent(headlines: NewsItem[]): Promise<string> {
  const lanes: BriefingLane[] = LANE_HEADINGS.map(({ category, heading }) => ({
    heading,
    articles: headlinesToArticles(
      headlines.filter((h) => h.category === category).slice(0, 5),
    ),
  })).filter((l) => l.articles.length > 0);

  if (lanes.length === 0) {
    throw new Error("no-lanes-with-content");
  }

  if (!isDeepSeekConfigured()) {
    console.error("[briefing] no DeepSeek provider configured — using fallback");
    return getFallbackBriefing(headlines);
  }

  const today = new Date().toISOString().slice(0, 10);
  const { text, stub } = await composeBriefing({
    lanes,
    date: today,
    userId: null,
    endpoint: "briefing",
  });

  if (stub) {
    console.error("[briefing] DeepSeek returned stub — using fallback");
    return getFallbackBriefing(headlines);
  }
  if (!text.trim()) {
    console.error("[briefing] DeepSeek returned empty text — using fallback");
    return getFallbackBriefing(headlines);
  }
  return text;
}

export async function generateBriefing(): Promise<BriefingData> {
  const headlines = await getTopHeadlines();

  if (headlines.length === 0) {
    return {
      content:
        "1. **Meridian is reaching its sources.** Feeds are temporarily unavailable. The briefing will return as soon as the wires recover.\n\nToday's focus\n• Stand by — Meridian is reconnecting.",
      generatedAt: new Date().toISOString(),
      headlineCount: 0,
    };
  }

  try {
    const content = await buildBriefingContent(headlines);
    return {
      content,
      generatedAt: new Date().toISOString(),
      headlineCount: headlines.length,
    };
  } catch (err) {
    console.error("[briefing] generation failed:", err);
    return {
      content: getFallbackBriefing(headlines),
      generatedAt: new Date().toISOString(),
      headlineCount: headlines.length,
    };
  }
}

function getFallbackBriefing(headlines: NewsItem[]): string {
  const topHeadlines = headlines.slice(0, 5);
  const titles = topHeadlines.map((h) => h.title).join(". ");
  return `1. **Meridian is aggregating ${headlines.length} stories across five intelligence lanes today.** ${titles}. Meridian AI is composing the editorial briefing in the background.\n\nToday's focus\n${topHeadlines
    .slice(0, 3)
    .map((h) => `• ${focusBullet(h)}`)
    .join("\n")}`;
}

// Cache key includes a version. Bump the suffix whenever the briefing
// format / prompt changes so old cached output is treated as a miss.
export const getCachedBriefing = unstable_cache(
  generateBriefing,
  ["daily-briefing-v3"],
  { revalidate: 43200, tags: ["briefing"] },
);
