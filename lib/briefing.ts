/**
 * briefing.ts — daily editorial briefing, powered by Meridian AI.
 *
 * Replaces the previous Anthropic-backed implementation. Now runs entirely
 * on the self-hosted summarizer (transformers.js, local models). No external
 * LLM API calls; no per-token cost.
 */
import { unstable_cache } from "next/cache";
import { getTopHeadlines, type NewsItem } from "./feeds";
import { summarize } from "./meridian-ai";
import type { ArticleInput } from "./meridian-ai";

export interface BriefingData {
  content: string;
  generatedAt: string;
  headlineCount: number;
}

const PARAGRAPH_LEADS: Array<{ category: NewsItem["category"]; lead: string }> = [
  { category: "world", lead: "Across the wires today" },
  { category: "business", lead: "On the business desk" },
  { category: "finance", lead: "In the markets" },
  { category: "ai", lead: "Inside AI and tech" },
  { category: "south-africa", lead: "From South Africa" },
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
 * Build the editorial briefing.
 * Composes per-category extractive summaries into the numbered, bold-led
 * paragraph format that Briefing.tsx already parses.
 */
async function buildBriefingContent(headlines: NewsItem[]): Promise<string> {
  const parts: string[] = [];
  let n = 1;

  for (const { category, lead } of PARAGRAPH_LEADS) {
    const slice = headlines.filter((h) => h.category === category).slice(0, 4);
    if (slice.length === 0) continue;

    let summary = "";
    try {
      const result = await summarize({
        articles: headlinesToArticles(slice),
        mode: "extractive",
        length: "short",
      });
      summary = result.summary.trim();
    } catch (err) {
      console.error(`[briefing] ${category} summary failed:`, err);
      summary = slice
        .slice(0, 2)
        .map((h) => h.title)
        .join(". ");
    }

    if (!summary) continue;
    parts.push(`${n}. **${lead}.** ${summary}`);
    n++;
  }

  // Focus bullets — three highest-priority items across all categories.
  const focusItems = pickFocus(headlines);
  parts.push("Today's focus");
  for (const item of focusItems) parts.push(`• ${focusBullet(item)}`);

  return parts.join("\n\n");
}

function pickFocus(headlines: NewsItem[]): NewsItem[] {
  const byTriangulation = [...headlines].sort(
    (a, b) =>
      (b.triangulationCount ?? 1) - (a.triangulationCount ?? 1) ||
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const seenCats = new Set<string>();
  const out: NewsItem[] = [];
  for (const h of byTriangulation) {
    if (seenCats.has(h.category)) continue;
    seenCats.add(h.category);
    out.push(h);
    if (out.length >= 3) break;
  }
  if (out.length < 3) {
    for (const h of byTriangulation) {
      if (out.includes(h)) continue;
      out.push(h);
      if (out.length >= 3) break;
    }
  }
  return out;
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

export const getCachedBriefing = unstable_cache(
  generateBriefing,
  ["daily-briefing"],
  { revalidate: 43200, tags: ["briefing"] },
);
