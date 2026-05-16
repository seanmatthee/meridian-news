/**
 * /api/daily-brief — returns today's brief for the logged-in user, if any.
 *
 * POST regenerates on demand (used by the "Refresh" button in My World).
 * GET just reads the latest one.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { generateDigestForUser } from "@/lib/daily-digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const brief = await prisma.dailyBrief.findUnique({
    where: { userId_date: { userId: user.id, date: todayDateOnly() } },
  });

  return NextResponse.json({
    brief: brief
      ? {
          date: brief.date.toISOString().slice(0, 10),
          filterText: brief.filterText,
          summary: brief.summary,
          createdAt: brief.createdAt.toISOString(),
        }
      : null,
    hasFilter: Boolean((user.filter ?? "").trim()),
  });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const result = await generateDigestForUser({
    userId: user.id,
    filter: user.filter,
    force: true,
  });

  if (result.status === "generated") {
    const brief = await prisma.dailyBrief.findUnique({
      where: { userId_date: { userId: user.id, date: todayDateOnly() } },
    });
    return NextResponse.json({
      ok: true,
      brief: brief
        ? {
            date: brief.date.toISOString().slice(0, 10),
            filterText: brief.filterText,
            summary: brief.summary,
            createdAt: brief.createdAt.toISOString(),
          }
        : null,
    });
  }

  return NextResponse.json(
    { ok: false, status: result.status, detail: result.detail },
    { status: 400 },
  );
}
