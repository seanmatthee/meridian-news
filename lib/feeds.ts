/**
 * feeds.ts — news aggregation and normalization layer.
 * Manages RSS source definitions, XML parsing, and lane aggregation.
 */
import { XMLParser } from "fast-xml-parser";
import { dedupeByUrl, toText, cleanText } from "./utils";
import { fetchWithBrowserHeaders, getLastGood, setLastGood } from "./fetch";

// ─── TYPES ─────────────────────────────────────────────────────

export interface NewsItem {
  title: string;
  url: string;
  description?: string;
  source: string;
  publishedAt: string; // ISO string
  category: LaneCategory;
  triangulationCount?: number;
}

export type LaneCategory = "ai" | "world" | "business" | "finance" | "south-africa";

interface FeedSource {
  name: string;
  url: string;
  category: LaneCategory;
}

// ─── FEED DEFINITIONS ──────────────────────────────────────────

const FEEDS: FeedSource[] = [
  // AI
  { name: "TechCrunch", url: "https://techcrunch.com/category/artificial-intelligence/feed/", category: "ai" },
  { name: "The Verge", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", category: "ai" },
  { name: "Hacker News", url: "https://hnrss.org/newest?q=ai+OR+llm+OR+model+OR+gpt+OR+claude&points=50", category: "ai" },

  // World
  { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "world" },
  { name: "The Guardian World", url: "https://www.theguardian.com/world/rss", category: "world" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "world" },

  // Business
  { name: "The Guardian Business", url: "https://www.theguardian.com/uk/business/rss", category: "business" },
  { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", category: "business" },
  { name: "Bloomberg", url: "https://feeds.bloomberg.com/markets/news.rss", category: "business" },

  // Finance
  { name: "Moneyweb", url: "https://www.moneyweb.co.za/feed/", category: "finance" },
  { name: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", category: "finance" },
  { name: "FT Markets", url: "https://www.ft.com/markets?format=rss", category: "finance" },

  // South Africa
  { name: "News24", url: "https://feeds.24.com/articles/news24/TopStories/rss", category: "south-africa" },
  { name: "Daily Maverick", url: "https://www.dailymaverick.co.za/feed/", category: "south-africa" },
  { name: "Moneyweb SA", url: "https://www.moneyweb.co.za/feed/", category: "south-africa" },
  { name: "MyBroadband", url: "https://mybroadband.co.za/news/feed", category: "south-africa" },
];

// ─── XML PARSER CONFIG ─────────────────────────────────────────

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => name === "item" || name === "entry",
});

// ─── INTERNAL ──────────────────────────────────────────────────

/**
 * Normalizes disparate RSS/Atom structures into a unified NewsItem format.
 */
function extractItems(
  parsed: Record<string, unknown>,
  source: FeedSource
): NewsItem[] {
  const items: NewsItem[] = [];

  try {
    // RSS 2.0
    const rssChannel =
      (parsed as Record<string, Record<string, Record<string, unknown[]>>>)?.rss?.channel;
    if (rssChannel) {
      const rssItems = (rssChannel.item as Record<string, unknown>[]) ?? [];
      for (const item of rssItems) {
        const title = cleanText(item.title);
        const link = toText(item.link || item.guid).trim();
        const desc = item.description ? cleanText(item.description).slice(0, 200) : undefined;
        const pubDate = toText(item.pubDate ?? item["dc:date"] ?? "").trim();

        if (title && link) {
          items.push({
            title,
            url: link,
            description: desc || undefined,
            source: source.name,
            publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            category: source.category,
          });
        }
      }
      return items;
    }

    // Atom
    const feed = (parsed as Record<string, Record<string, unknown>>)?.feed;
    if (feed) {
      const entries = (feed.entry as Record<string, unknown>[]) ?? [];
      for (const entry of entries) {
        const title = cleanText(entry.title);
        let link = "";
        if (typeof entry.link === "string") {
          link = entry.link;
        } else if (Array.isArray(entry.link)) {
          const alternate = (entry.link as Record<string, string>[]).find(
            (l) => l["@_rel"] === "alternate" || !l["@_rel"]
          );
          link = alternate?.["@_href"] ?? String((entry.link as Record<string, string>[])[0]?.["@_href"] ?? "");
        } else if (entry.link && typeof entry.link === "object") {
          link = (entry.link as Record<string, string>)["@_href"] ?? "";
        }
        
        const desc = entry.summary
          ? cleanText(entry.summary).slice(0, 200)
          : (entry.content ? cleanText(entry.content).slice(0, 200) : undefined);
        const pubDate = toText(entry.updated ?? entry.published ?? "").trim();

        if (title && link) {
          items.push({
            title,
            url: link,
            description: desc || undefined,
            source: source.name,
            publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            category: source.category,
          });
        }
      }
      return items;
    }
  } catch (e) {
    console.error(`[feeds] Error parsing items from ${source.name}:`, e);
  }

  return items;
}

/**
 * Fetches a single feed source with browser-emulating headers and SWR caching.
 */
async function fetchFeed(source: FeedSource): Promise<NewsItem[]> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml",
    };

    // Daily Maverick requires a Referer to bypass edge blocks
    if (source.name === "Daily Maverick") {
      headers["Referer"] = "https://www.dailymaverick.co.za/";
    }

    const response = await fetchWithBrowserHeaders(source.url, {
      revalidate: 600,
      headers,
    });

    if (!response.ok) {
      console.warn(`[fetch-failure] ${source.name} returned ${response.status}`);
      return getLastGood<NewsItem[]>(source.url) ?? [];
    }

    const text = await response.text();
    const parsed = parser.parse(text);
    const items = extractItems(parsed, source);
    
    if (items.length > 0) {
      setLastGood(source.url, items);
    }
    
    return items;
  } catch (error) {
    console.warn(`[fetch-failure] Failed to fetch ${source.name}:`, error);
    return getLastGood<NewsItem[]>(source.url) ?? [];
  }
}

// ─── PUBLIC API ────────────────────────────────────────────────

/**
 * Aggregates all sources for a specific category lane.
 */
export async function getLane(category: LaneCategory): Promise<NewsItem[]> {
  const sources = FEEDS.filter((f) => f.category === category);
  const results = await Promise.allSettled(sources.map((s) => fetchFeed(s)));

  const allItems: NewsItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }

  const deduped = dedupeByUrl(allItems);
  deduped.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  
  return deduped.slice(0, 25);
}

/**
 * Returns a full registry of all news lanes.
 */
export async function getAllLanes(): Promise<Record<LaneCategory, NewsItem[]>> {
  const categories: LaneCategory[] = ["ai", "world", "business", "finance", "south-africa"];
  const results = await Promise.allSettled(categories.map((cat) => getLane(cat)));

  const lanes: Record<LaneCategory, NewsItem[]> = {
    ai: [],
    world: [],
    business: [],
    finance: [],
    "south-africa": [],
  };

  categories.forEach((cat, i) => {
    const result = results[i];
    if (result.status === "fulfilled") {
      lanes[cat] = result.value;
    }
  });

  return lanes;
}

/**
 * Returns top headlines across all domains for the AI briefing module.
 */
export async function getTopHeadlines(): Promise<NewsItem[]> {
  const lanes = await getAllLanes();
  const all: NewsItem[] = [];
  
  Object.values(lanes).forEach(items => {
    all.push(...items.slice(0, 5));
  });

  all.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return all.slice(0, 25);
}


