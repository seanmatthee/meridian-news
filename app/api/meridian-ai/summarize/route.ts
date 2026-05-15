import { NextResponse } from "next/server";
import { summarize } from "@/lib/meridian-ai";
import type {
  ArticleInput,
  IntentResult,
  SummaryLength,
  SummaryMode,
} from "@/lib/meridian-ai";

export const runtime = "nodejs";

interface SummarizeBody {
  articles?: ArticleInput[];
  articleIds?: string[];
  mode: SummaryMode;
  length: SummaryLength;
  intent?: IntentResult;
  sessionId?: string;
  queryId?: number;
}

const VALID_MODES = new Set(["extractive", "abstractive"]);
const VALID_LENGTHS = new Set(["short", "medium", "long"]);

export async function POST(req: Request) {
  let body: SummarizeBody;
  try {
    body = (await req.json()) as SummarizeBody;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  if (!VALID_MODES.has(body.mode)) {
    return NextResponse.json({ error: "bad-mode" }, { status: 400 });
  }
  if (!VALID_LENGTHS.has(body.length)) {
    return NextResponse.json({ error: "bad-length" }, { status: 400 });
  }
  if (!body.articles || body.articles.length === 0) {
    return NextResponse.json({ error: "no-articles" }, { status: 400 });
  }

  try {
    const result = await summarize({
      articles: body.articles,
      mode: body.mode,
      length: body.length,
      intent: body.intent,
      sessionId: body.sessionId,
      queryId: body.queryId,
    });
    return NextResponse.json(result);
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    const message = String((err as Error).message ?? err);
    if (status === 400) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[meridian-ai] summarize failed:", err);
    return NextResponse.json(
      { error: "inference-failed", detail: message },
      { status: 500 },
    );
  }
}
