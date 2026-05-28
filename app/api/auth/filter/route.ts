/**
 * /api/auth/filter — GET/PUT the logged-in user's daily news filter text.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getRequestIp, isIpRateLimited } from "@/lib/rate-limit-ip";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ filter: user.filter ?? "" });
}

export async function PUT(req: Request) {
  const ip = getRequestIp(req);
  if (isIpRateLimited(ip, { scope: "auth/filter", limit: 30, windowMs: 60 * 60 * 1000 })) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: { filter?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const filter = (body.filter ?? "").trim();
  if (filter.length > 1000) {
    return NextResponse.json({ error: "Filter is too long (max 1000 chars)." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { filter: filter || null },
  });

  return NextResponse.json({ ok: true, filter });
}
