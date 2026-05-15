import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }
  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "missing-session" }, { status: 400 });
  }

  // Cascade-deletes the queries via the relation; the summaries remain so
  // their cache benefit isn't lost.
  const session = await prisma.userSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ cleared: 0 });
  }
  const before = await prisma.userQuery.count({ where: { sessionId } });
  await prisma.userSession.delete({ where: { id: sessionId } });
  return NextResponse.json({ cleared: before });
}
