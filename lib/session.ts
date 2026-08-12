// Server-only helpers for reading "who is signed in" inside Server
// Components, Server Actions, and API route handlers.

import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySession, type SessionPayload, type Role } from "@/lib/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function getSessionUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Throws UnauthorizedError (401) if nobody is signed in. */
export async function requireUser(): Promise<SessionPayload> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Throws UnauthorizedError (401) or ForbiddenError (403) as appropriate. */
export async function requireRole(...roles: Role[]): Promise<SessionPayload> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new ForbiddenError();
  }
  return user;
}
