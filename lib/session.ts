// Server-only helpers for reading "who is signed in" inside Server
// Components, Server Actions, and API route handlers.

import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySession, type SessionPayload } from "@/lib/auth";
import type { Role } from "@/lib/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function getSessionUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySession(token);
  if (!payload) return null;

  // The JWT itself has no idea if this account was deactivated or had its
  // role changed after the session was issued — a signed token stays
  // "valid" until it expires regardless of what happens to the account in
  // the meantime. Re-check the current state on every request so
  // deactivating someone (or changing their role) takes effect
  // immediately instead of up to 12 hours later. This costs one indexed
  // lookup by primary key per request, which is fine at this app's scale.
  const current = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { active: true, role: true, name: true, email: true },
  });
  if (!current || !current.active) return null;

  return { ...payload, role: current.role, name: current.name, email: current.email };
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
