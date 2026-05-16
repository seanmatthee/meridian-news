import bcrypt from "bcryptjs";

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function validatePassword(plain: string): string | null {
  if (typeof plain !== "string") return "Password is required.";
  if (plain.length < 8) return "Password must be at least 8 characters.";
  if (plain.length > 200) return "Password is too long.";
  return null;
}

export function validateEmail(email: string): string | null {
  if (typeof email !== "string") return "Email is required.";
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return "Email is required.";
  // Reasonable email pattern — not RFC-perfect, intentionally.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Enter a valid email.";
  if (trimmed.length > 254) return "Email is too long.";
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
