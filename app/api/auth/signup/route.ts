/**
 * /api/auth/signup — accepts email + password, generates OTP, emails it.
 *
 * Stores a PendingUser row (or upserts if one already exists for this email).
 * Does NOT create a real User until the OTP is verified.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  normalizeEmail,
  validateEmail,
  validatePassword,
} from "@/lib/auth/password";
import { generateOtp, hashOtp, otpExpiry } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/email/send";
import { getRequestIp, isIpRateLimited } from "@/lib/rate-limit-ip";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Stop OTP/email abuse from a single IP before doing any DB work.
  const ip = getRequestIp(req);
  if (isIpRateLimited(ip, { scope: "auth/signup", limit: 5, windowMs: 60 * 60 * 1000 })) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const emailErr = validateEmail(body.email ?? "");
  const pwErr = validatePassword(body.password ?? "");
  if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

  const email = normalizeEmail(body.email!);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    // Don't reveal whether the email is taken to a stranger — but if it's the
    // user themselves, redirecting to login is the right call.
    return NextResponse.json(
      { error: "An account with that email already exists. Try logging in." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(body.password!);
  const otp = generateOtp();
  const otpHashed = hashOtp(otp);
  const expiresAt = otpExpiry();

  await prisma.pendingUser.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      otpHash: otpHashed,
      otpExpiresAt: expiresAt,
      attempts: 0,
    },
    update: {
      passwordHash,
      otpHash: otpHashed,
      otpExpiresAt: expiresAt,
      attempts: 0,
    },
  });

  try {
    await sendOtpEmail({ to: email, otp });
  } catch (err) {
    console.error("[auth/signup] email failed:", err);
    return NextResponse.json(
      { error: "Couldn't send the verification email. Try again in a moment." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, email });
}
