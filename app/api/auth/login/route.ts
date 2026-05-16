/**
 * /api/auth/login — email + password login.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizeEmail,
  validateEmail,
  verifyPassword,
} from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const GENERIC_ERROR = "Email or password is incorrect.";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const emailErr = validateEmail(body.email ?? "");
  if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });
  if (!body.password) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const email = normalizeEmail(body.email!);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }
  const ok = await verifyPassword(body.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true, userId: user.id });
}
