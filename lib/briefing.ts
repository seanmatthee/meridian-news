import Anthropic from "@anthropic-ai/sdk";
import { getTopHeadlines, type NewsItem } from "./feeds";

const SYSTEM_PROMPT = `You write a 250–350 word daily briefing for an investor and founder based in South Africa. Editorial tone, no fluff, no marketing language. Lead with what changed. Cover global markets, AI, geopolitics, and any major SA-specific event. End with three short imperative bullets under a 'Today's focus' header.

Format your response as follows:
- Number each paragraph (1. 2. 3. etc.)
- Start each paragraph with a **bold one-line claim** followed by 2 sentences explaining significance and implication.
- End with a "Today's focus" section with exactly 3 bullet points, each a single imperative sentence.

Do not use markdown headers. Just use the numbered format and bold text. Keep it tight and editorial.`;

export interface BriefingData {
  content: string;
  generatedAt: string;
  headlineCount: number;
}

/**
 * Generate an AI-powered daily briefing from top headlines.
 * Falls back to a static message if the API key is missing or the call fails.
 */
export async function generateBriefing(): Promise<BriefingData> {
  const headlines = await getTopHeadlines();

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      content: getFallbackBriefing(headlines),
      generatedAt: new Date().toISOString(),
      headlineCount: headlines.length,
    };
  }

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const headlineText = headlines
      .map(
        (h, i) =>
          `${i + 1}. [${h.category.toUpperCase()}] ${h.title} (${h.source})`
      )
      .join("\n");

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Here are today's top ${headlines.length} headlines across AI, world news, business, finance, and South Africa:\n\n${headlineText}\n\nWrite the daily briefing.`,
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === "text");
    const briefingText = textContent?.text ?? getFallbackBriefing(headlines);

    return {
      content: briefingText,
      generatedAt: new Date().toISOString(),
      headlineCount: headlines.length,
    };
  } catch (error) {
    console.error("[briefing] Anthropic API error:", error);
    return {
      content: getFallbackBriefing(headlines),
      generatedAt: new Date().toISOString(),
      headlineCount: headlines.length,
    };
  }
}

/**
 * Fallback briefing when API is unavailable.
 */
function getFallbackBriefing(headlines: NewsItem[]): string {
  const categoryCounts: Record<string, number> = {};
  for (const h of headlines) {
    categoryCounts[h.category] = (categoryCounts[h.category] || 0) + 1;
  }

  const topHeadlines = headlines.slice(0, 5);

  return `1. **Meridian is aggregating ${headlines.length} stories across five intelligence lanes today.** The briefing engine requires an Anthropic API key to generate AI-powered analysis. Connect your key in .env.local to activate daily intelligence summaries.

2. **Today's signal spans ${Object.keys(categoryCounts).length} domains.** ${topHeadlines.map((h) => h.title).join(". ")}. Each lane surfaces the most recent developments from trusted editorial sources.

3. **The full briefing will synthesize cross-domain trends and surface what matters most.** Once configured, Meridian generates a 250–350 word editorial briefing every 30 minutes, covering global markets, AI developments, geopolitical shifts, and South African affairs.

Today's focus
• Configure your ANTHROPIC_API_KEY in .env.local to activate AI-generated briefings.
• Review each lane for breaking developments across your five intelligence domains.
• Watch for cross-domain patterns — market moves often correlate with geopolitical shifts.`;
}
