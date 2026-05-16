import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
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
