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
import {
  interpretIntent,
  postIntentScopeCheck,
  preflightScopeCheck,
} from "@/lib/meridian-ai";
import type { SummaryLength, SummaryMode } from "@/lib/meridian-ai";
import { selectArticlesForIntent } from "@/lib/meridian-ai/news-bridge";
import { summarizeWithDeepSeek } from "@/lib/meridian-ai/summarize";
import { getCurrentUser } from "@/lib/auth/session";

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

  try {
    const sessionId = await ensureUserSession(user.id);

    const preflight = preflightScopeCheck(text);
    if (!preflight.ok) {
      const refusalRow = await prisma.userQuery.create({
        data: {
          sessionId,
          rawText: text,
          interpretedIntent: JSON.stringify({ refused: true, reason: preflight.reason }),
        },
      });
      return NextResponse.json({
        queryId: refusalRow.id,
        intent: { outlets: [], topics: [], region: "global", timeframe: "today", confidence: 0 },
        articles: [],
        summary: preflight.message,
        mode,
        length,
        message: "off-topic",
      });
    }

    const intent = await interpretIntent(text);

    const postCheck = postIntentScopeCheck(
      text,
      intent.confidence,
      intent.outlets.length,
      intent.topics.length,
    );
    if (!postCheck.ok) {
      const refusalRow = await prisma.userQuery.create({
        data: {
          sessionId,
          rawText: text,
          interpretedIntent: JSON.stringify({ ...intent, refused: true, reason: postCheck.reason }),
        },
      });
      return NextResponse.json({
        queryId: refusalRow.id,
        intent,
        articles: [],
        summary: postCheck.message,
        mode,
        length,
        message: "off-topic",
      });
    }

    const queryRow = await prisma.userQuery.create({
      data: {
        sessionId,
        rawText: text,
        interpretedIntent: JSON.stringify(intent),
      },
    });

    const articles = await selectArticlesForIntent(intent, { maxArticles: 12 });
    if (articles.length === 0) {
      return NextResponse.json({
        queryId: queryRow.id,
        intent,
        articles: [],
        summary: null,
        mode,
        length,
        message: "no-matching-articles",
      });
    }

    const result = await summarizeWithDeepSeek({
      question: text,
      articles,
      intent,
      sessionId,
      queryId: queryRow.id,
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
