import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getRequestIp, isIpRateLimited } from "@/lib/rate-limit-ip";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  if (isIpRateLimited(ip, { scope: "history/clear", limit: 10, windowMs: 60 * 60 * 1000 })) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const before = await prisma.userQuery.count({ where: { sessionId: user.id } });
  // Deleting the session cascades to its queries. Summaries remain so the
  // cache benefit isn't lost across users.
  await prisma.userSession.deleteMany({ where: { id: user.id } });
  return NextResponse.json({ cleared: before });
}
