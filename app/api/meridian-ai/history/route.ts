import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { HistoryItem, IntentResult, SummaryMode } from "@/lib/meridian-ai";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const rows = await prisma.userQuery.findMany({
    where: { sessionId: user.id },
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
