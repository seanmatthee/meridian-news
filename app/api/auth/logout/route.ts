import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { getRequestIp, isIpRateLimited } from "@/lib/rate-limit-ip";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  if (isIpRateLimited(ip, { scope: "auth/logout", limit: 30, windowMs: 60 * 60 * 1000 })) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
