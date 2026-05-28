/**
 * /api/meridian-ai/ask — end-to-end My World handler.
 *
 *  1. Interpret the user's text into an IntentResult.
 *  2. Resolve that intent to a concrete article list via the news bridge.
 *  3. Summarize.
 *  4. Persist UserSession + UserQuery + link to UserSummary.
 *
 * Returns the intent, the chosen source articles, and the summary text.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { interpretIntent } from "@/lib/meridian-ai";
import type { SummaryLength, SummaryMode } from "@/lib/meridian-ai";
import { selectArticlesForIntent } from "@/lib/meridian-ai/news-bridge";
import { summarizeWithDeepSeek } from "@/lib/meridian-ai/summarize";
import { answerWithoutArticles } from "@/lib/deepseek/analyze";
import { checkRateLimit } from "@/lib/deepseek/rate-limit";
import { getCurrentUser } from "@/lib/auth/session";
import { getRequestIp, isIpRateLimited } from "@/lib/rate-limit-ip";

export const runtime = "nodejs";

interface AskBody {
  text: string;
  mode?: SummaryMode;
  length?: SummaryLength;
}

async function ensureUserSession(userId: string): Promise<string> {
  // One UserSession per user, id == userId. Idempotent.
  await prisma.userSession.upsert({
    where: { id: userId },
    create: { id: userId, userId },
    update: {},
  });
  return userId;
}

export async function POST(req: Request) {
  // IP-level guard runs first — if a botnet rotates accounts behind one IP,
  // the per-user DeepSeek limiter wouldn't catch it.
  const ip = getRequestIp(req);
  if (isIpRateLimited(ip, { scope: "meridian-ai/ask", limit: 60, windowMs: 60 * 60 * 1000 })) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: AskBody;
  try {
    body = (await req.json()) as AskBody;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const text = body.text?.trim();
  const mode: SummaryMode = body.mode === "abstractive" ? "abstractive" : "extractive";
  const length: SummaryLength = body.length ?? "medium";

  if (!text) {
    return NextResponse.json({ error: "empty-input" }, { status: 400 });
  }

  // Rate limit before doing any work — intent classification is cheap but
  // we still want to fail fast and avoid loading the model when a user is
  // already over their quota.
  const gate = await checkRateLimit({ userId: user.id, endpoint: "ask" });
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "rate-limited", reason: gate.reason, detail: gate.detail },
      {
        status: 429,
        headers: gate.retryAfterSec
          ? { "Retry-After": String(gate.retryAfterSec) }
          : undefined,
      },
    );
  }

  try {
    const sessionId = await ensureUserSession(user.id);

    // Scope guard removed — the regex heuristics were rejecting too many
    // legitimate news questions. DeepSeek's own system prompt handles
    // off-topic refusals, and the per-call USD cap in deepseek/client
    // limits the blast radius of any single bad question.
    const intent = await interpretIntent(text);

    const queryRow = await prisma.userQuery.create({
      data: {
        sessionId,
        rawText: text,
        interpretedIntent: JSON.stringify(intent),
      },
    });

    const articles = await selectArticlesForIntent(intent, { maxArticles: 12 });
    if (articles.length === 0) {
      // No articles matched — let DeepSeek answer from general knowledge if
      // the question is news-shaped, or refuse if it's clearly off-topic.
      const fallback = await answerWithoutArticles({
        question: text,
        userId: user.id,
        endpoint: "ask",
      });
      return NextResponse.json({
        queryId: queryRow.id,
        intent,
        articles: [],
        summary: fallback.text,
        mode,
        length,
        message: "no-matching-articles",
        stub: fallback.stub,
      });
    }

    const result = await summarizeWithDeepSeek({
      question: text,
      articles,
      intent,
      sessionId,
      queryId: queryRow.id,
      userId: user.id,
      endpoint: "ask",
    });

    return NextResponse.json({
      queryId: queryRow.id,
      intent,
      articles: result.sourceArticles,
      summary: result.summary,
      mode: "abstractive",
      length,
      cached: result.cached,
      stub: result.stub,
    });
  } catch (err) {
    console.error("[meridian-ai] ask failed:", err);
    return NextResponse.json(
      { error: "inference-failed", detail: String((err as Error).message ?? err) },
      { status: 500 },
    );
  }
}
