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
import { interpretIntent, summarize } from "@/lib/meridian-ai";
import type { SummaryLength, SummaryMode } from "@/lib/meridian-ai";
import { selectArticlesForIntent } from "@/lib/meridian-ai/news-bridge";

export const runtime = "nodejs";

interface AskBody {
  sessionId: string;
  text: string;
  mode?: SummaryMode;
  length?: SummaryLength;
}

export async function POST(req: Request) {
  let body: AskBody;
  try {
    body = (await req.json()) as AskBody;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  const text = body.text?.trim();
  const mode: SummaryMode = body.mode === "abstractive" ? "abstractive" : "extractive";
  const length: SummaryLength = body.length ?? "medium";

  if (!sessionId) {
    return NextResponse.json({ error: "missing-session" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "empty-input" }, { status: 400 });
  }

  try {
    const intent = await interpretIntent(text);

    await prisma.userSession.upsert({
      where: { id: sessionId },
      create: { id: sessionId },
      update: {},
    });
    const queryRow = await prisma.userQuery.create({
      data: {
        sessionId,
        rawText: text,
        interpretedIntent: JSON.stringify(intent),
      },
    });

    const articles = await selectArticlesForIntent(intent, { maxArticles: 8 });
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

    const result = await summarize({
      articles,
      mode,
      length,
      intent,
      sessionId,
      queryId: queryRow.id,
    });

    return NextResponse.json({
      queryId: queryRow.id,
      intent,
      articles: result.sourceArticles,
      summary: result.summary,
      mode: result.mode,
      length: result.length,
      cached: result.cached,
    });
  } catch (err) {
    console.error("[meridian-ai] ask failed:", err);
    return NextResponse.json(
      { error: "inference-failed", detail: String((err as Error).message ?? err) },
      { status: 500 },
    );
  }
}
