import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { HistoryItem, IntentResult, SummaryMode } from "@/lib/meridian-ai";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId")?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "missing-session" }, { status: 400 });
  }

  const rows = await prisma.userQuery.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    include: { summary: true },
  });

  const items: HistoryItem[] = rows.map((r) => {
    let intent: IntentResult | null = null;
    try {
      intent = r.interpretedIntent
        ? (JSON.parse(r.interpretedIntent) as IntentResult)
        : null;
    } catch {
      intent = null;
    }
    return {
      queryId: r.id,
      rawText: r.rawText,
      intent,
      summary: r.summary?.summaryText ?? null,
      mode: (r.summary?.mode as SummaryMode | undefined) ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ items });
}

interface CreateQueryBody {
  sessionId: string;
  rawText: string;
  intent: IntentResult;
}

export async function POST(req: Request) {
  let body: CreateQueryBody;
  try {
    body = (await req.json()) as CreateQueryBody;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }
  if (!body.sessionId || !body.rawText?.trim() || !body.intent) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }

  // Upsert the session row (no-op if it already exists).
  await prisma.userSession.upsert({
    where: { id: body.sessionId },
    create: { id: body.sessionId },
    update: {},
  });

  const q = await prisma.userQuery.create({
    data: {
      sessionId: body.sessionId,
      rawText: body.rawText.trim(),
      interpretedIntent: JSON.stringify(body.intent),
    },
  });

  return NextResponse.json({ queryId: q.id });
}
