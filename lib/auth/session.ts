/**
 * session — cookie-backed login sessions.
 *
 * On login: generate a random token, store it in AuthSession with the userId,
 * set an httpOnly cookie. On request: read the cookie, look up the row,
 * return the User. 30-day expiry.
 */
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "meridian_session";
const SESSION_TTL_DAYS = 30;

function newToken(): string {
  return randomBytes(32).toString("hex");
}

function expiryDate(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function createSession(userId: string): Promise<void> {
  const token = newToken();
  const expiresAt = expiryDate();
  await prisma.authSession.create({
    data: { userId, token, expiresAt },
  });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.authSession.deleteMany({ where: { token } });
  }
  jar.delete(COOKIE_NAME);
}

export interface CurrentUser {
  id: string;
  email: string;
  filter: string | null;
  emailVerified: Date | null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { token },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.authSession.delete({ where: { id: session.id } });
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, filter: true, emailVerified: true },
  });
  return user;
}
