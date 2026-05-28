/**
 * /api/auth/verify — completes signup by checking the OTP.
 *
 * On success: deletes the PendingUser, creates a real User, sets a session
 * cookie, returns ok.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, validateEmail } from "@/lib/auth/password";
import { hashOtp, isOtpExpired, isOtpLockedOut } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";
import { getRequestIp, isIpRateLimited } from "@/lib/rate-limit-ip";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // OTP brute-force from a single IP. The per-pending-user lockout already
  // exists; this stops the attacker who rotates the email address.
  const ip = getRequestIp(req);
  if (isIpRateLimited(ip, { scope: "auth/verify", limit: 15, windowMs: 15 * 60 * 1000 })) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  let body: { email?: string; otp?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const emailErr = validateEmail(body.email ?? "");
  if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });
  const otp = (body.otp ?? "").trim();
  if (!/^\d{6}$/.test(otp)) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const email = normalizeEmail(body.email!);
  const pending = await prisma.pendingUser.findUnique({ where: { email } });
  if (!pending) {
    return NextResponse.json(
      { error: "No pending signup for that email. Try signing up again." },
      { status: 404 },
    );
  }

  if (isOtpLockedOut(pending.attempts)) {
    return NextResponse.json(
      { error: "Too many failed attempts. Sign up again to get a new code." },
      { status: 429 },
    );
  }

  if (isOtpExpired(pending.otpExpiresAt)) {
    return NextResponse.json(
      { error: "That code has expired. Sign up again to get a new one." },
      { status: 410 },
    );
  }

  const submitted = hashOtp(otp);
  if (submitted !== pending.otpHash) {
    await prisma.pendingUser.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: "That code doesn't match." }, { status: 400 });
  }

  // Promote PendingUser → User. Run in a transaction so we don't end up with
  // a half-created user if either step fails.
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        passwordHash: pending.passwordHash,
        emailVerified: new Date(),
      },
    });
    await tx.pendingUser.delete({ where: { email } });
    return created;
  });

  await createSession(user.id);

  return NextResponse.json({ ok: true, userId: user.id });
}
