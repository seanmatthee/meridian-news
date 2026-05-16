/**
 * OTP — 6-digit one-time codes for email verification.
 *
 * The OTP itself is hashed (sha256) before being stored in PendingUser.
 * We never persist the plaintext code; verification re-hashes the user's
 * input and compares.
 */
import { createHash, randomInt } from "crypto";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export function generateOtp(): string {
  // 6 digits, zero-padded.
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

export function otpExpiry(): Date {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
}

export function isOtpExpired(expiresAt: Date): boolean {
  return Date.now() > expiresAt.getTime();
}

export function isOtpLockedOut(attempts: number): boolean {
  return attempts >= MAX_ATTEMPTS;
}

export const OTP_CONFIG = {
  ttlMinutes: OTP_TTL_MINUTES,
  maxAttempts: MAX_ATTEMPTS,
};
