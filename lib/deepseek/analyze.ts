/**
 * deepseek/analyze — opinionated wrappers for the two ways Meridian uses the LLM.
 *
 *   answerNewsQuery — for My World. Takes a user question + matched articles,
 *     returns a connected analytical answer that cites each outlet.
 *
 *   composeBriefing — for The World. Takes today's headlines bucketed by
 *     category and returns the multi-paragraph briefing with a goal-shaped
 *     "Today's focus" block.
 */
import { chatCompletion, type ChatMessage } from "./client";
import type { ArticleInput } from "@/lib/meridian-ai";

const NEWS_SYSTEM_PROMPT = [
  "You are Meridian, an analytical news assistant.",
  "You ONLY answer questions about news, current events, markets, politics,",
  "and topics covered by the article set you are given. If the user's question",
  "is unrelated to news, respond with one sentence:",
  '"I only cover news — try asking about a topic, an outlet, or what\'s happening today."',
  "",
  "When you do answer:",
  "- Synthesize across the provided articles. Identify what they agree on,",
  "  where they disagree, and what is still unknown.",
  "- Write 3-5 tight paragraphs. No filler, no hedging clichés.",
  "- Cite outlets inline like (Reuters), (BBC), (Bloomberg).",
  "- If two articles report contradicting facts, say so explicitly.",
  "- End with one sentence on what to watch next.",
  "- Never invent facts not in the articles. Never use external knowledge.",
].join("\n");

const BRIEFING_SYSTEM_PROMPT = [
  "You are Meridian, the editor of a daily intelligence briefing.",
  "You write for busy readers who need to understand the day in 90 seconds.",
  "",
  "Output format — follow EXACTLY:",
  "  1. **Lane heading.** Two to four sentences synthesizing the lane's stories.",
  "  2. **Lane heading.** Same.",
  "  (continue for each lane provided)",
  "",
  "  Today's focus",
  "  • One concrete action the reader should take or thing to watch today,",
  "    derived from the most consequential story.",
  "  • Same.",
  "  • Same.",
  "",
  "Rules:",
  "- Each lane paragraph must connect its stories, not list them.",
  "- The 'Today's focus' bullets must be ACTIONABLE GOALS or specific things",
  "  to monitor today — e.g. 'Check JSE close for ABSA reaction to the rate",
  "  decision' — NOT a restatement of headlines.",
  "- No external knowledge. No invented facts. Only use the headlines provided.",
].join("\n");

function articlesToContext(articles: ArticleInput[]): string {
  return articles
    .map(
      (a, i) =>
        `[${i + 1}] ${a.source} — ${a.title}\n${a.content?.slice(0, 800) ?? ""}`,
    )
    .join("\n\n");
}

export async function answerNewsQuery(opts: {
  question: string;
  articles: ArticleInput[];
}): Promise<{ text: string; stub: boolean }> {
  const messages: ChatMessage[] = [
    { role: "system", content: NEWS_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        `Question: ${opts.question}`,
        "",
        "Articles:",
        articlesToContext(opts.articles),
      ].join("\n"),
    },
  ];

  const res = await chatCompletion({
    messages,
    temperature: 0.3,
    maxTokens: 900,
  });
  return { text: res.text, stub: res.stub };
}

export interface BriefingLane {
  heading: string;
  articles: ArticleInput[];
}

export async function composeBriefing(opts: {
  lanes: BriefingLane[];
  date: string;
}): Promise<{ text: string; stub: boolean }> {
  const lanesBlock = opts.lanes
    .filter((l) => l.articles.length > 0)
    .map(
      (l) =>
        `### ${l.heading}\n${l.articles
          .slice(0, 5)
          .map(
            (a) => `- ${a.source}: ${a.title}${a.content ? ` — ${a.content.slice(0, 240)}` : ""}`,
          )
          .join("\n")}`,
    )
    .join("\n\n");

  const messages: ChatMessage[] = [
    { role: "system", content: BRIEFING_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        `Date: ${opts.date}`,
        "",
        "Compose today's briefing from these lanes:",
        "",
        lanesBlock,
      ].join("\n"),
    },
  ];

  const res = await chatCompletion({
    messages,
    temperature: 0.4,
    maxTokens: 1400,
  });
  return { text: res.text, stub: res.stub };
}
