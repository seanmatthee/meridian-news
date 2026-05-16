/**
 * scope-guard — keeps Meridian AI on-topic.
 *
 * Meridian only answers questions about news / current events / outlets / topics.
 * Coding tasks, math help, recipes, "write me X", roleplay, etc. are refused
 * before we spend any model cycles on them.
 *
 * Two-stage check:
 *   1. Hard refusal patterns — common off-topic asks (code, math, write essay).
 *   2. News-affinity heuristic — if the query has zero news-shaped signal
 *      AND the intent classifier returned no outlet/topic match, treat as
 *      off-topic. Called from the route after interpretIntent runs.
 */

const REFUSAL_PATTERNS: RegExp[] = [
  // Code / programming
  /\b(write|generate|fix|debug|refactor|explain)\b.*\b(code|function|script|program|component|class|method|bug|error|stack trace|regex|sql|query)\b/i,
  /\b(python|javascript|typescript|java|c\+\+|c#|rust|golang|html|css|react|next\.?js|node\.?js|prisma|tailwind)\b.*\b(code|function|script|how to|tutorial|example|syntax)\b/i,
  /```/, // any fenced code block in the prompt
  /\bnpm\s+(install|run|i)\b/i,
  /\bgit\s+(clone|push|pull|commit|checkout)\b/i,
  // Math / homework
  /\b(solve|calculate|compute|derive|integrate|differentiate)\b.*\b(equation|integral|derivative|x\s*=|formula)\b/i,
  /\bwhat is\s+\d+\s*[+\-*/x]\s*\d+/i,
  // Creative / personal
  /\b(write|compose|draft)\b.*\b(poem|essay|story|email|letter|cover letter|resume|cv|tweet|caption|song|lyrics)\b/i,
  /\b(roleplay|pretend (you|to be)|act as|you are now)\b/i,
  // Recipes / how-to lifestyle
  /\b(recipe|how to cook|how do i make)\b/i,
  // Personal advice
  /\b(should i|do you think i should|give me advice on)\b/i,
];

const NEWS_AFFINITY_PATTERNS: RegExp[] = [
  /\b(news|headline|story|article|report|coverage|update|briefing|brief)\b/i,
  /\b(today|this (week|month|morning|evening)|latest|recent|breaking|just (in|now)|happening)\b/i,
  /\b(market|stock|share|jse|nasdaq|nyse|earnings|economy|inflation|interest rate|gdp|budget)\b/i,
  /\b(election|president|prime minister|government|parliament|policy|bill|law passed|treaty)\b/i,
  /\b(war|conflict|attack|protest|crisis|deal|summit|sanction|tariff|strike)\b/i,
  /\b(launch|release|announce|unveil|reveal|merger|acquisition|ipo|deal)\b/i,
  /\b(catch (me )?up|what'?s (going on|happening|new))\b/i,
  /\b(ai|tech|technology|crypto|bitcoin|climate|sport|football|rugby|cricket)\b/i,
];

export type ScopeDecision =
  | { ok: true }
  | { ok: false; reason: "hard-refusal" | "no-news-signal"; message: string };

const REFUSAL_MESSAGE =
  "I'm Meridian — I only answer questions about the news. Try asking about a topic, an outlet, or what's happening today.";

/**
 * First-pass check. Run before any model inference. Cheap regex only.
 * Returns ok:false for queries that are obviously not news asks.
 */
export function preflightScopeCheck(text: string): ScopeDecision {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true };

  for (const rx of REFUSAL_PATTERNS) {
    if (rx.test(trimmed)) {
      return { ok: false, reason: "hard-refusal", message: REFUSAL_MESSAGE };
    }
  }

  return { ok: true };
}

/**
 * Second-pass check. Run after interpretIntent.
 *
 * If the embedding classifier found no matching outlet or topic above its
 * minimum-score threshold AND there's no news-affinity keyword in the raw
 * text, the query is almost certainly off-topic — refuse rather than return
 * the inevitable "no matching articles" empty state.
 */
export function postIntentScopeCheck(
  text: string,
  intentConfidence: number,
  outletCount: number,
  topicCount: number,
): ScopeDecision {
  if (outletCount > 0 || topicCount > 0) return { ok: true };
  if (intentConfidence >= 0.25) return { ok: true };

  const hasNewsKeyword = NEWS_AFFINITY_PATTERNS.some((rx) => rx.test(text));
  if (hasNewsKeyword) return { ok: true };

  return { ok: false, reason: "no-news-signal", message: REFUSAL_MESSAGE };
}
