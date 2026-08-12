// Page-level (Server Component) auth guard. Unlike requireRole() in
// lib/session.ts (which throws, for API routes), this redirects — the
// right behavior inside a page/layout. proxy.ts already redirects
// unauthenticated/unauthorized page visits before they get this far; this
// is a second, defense-in-depth check right at render time.

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import type { Role, SessionPayload } from "@/lib/auth";

const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  OFFICE_STAFF: "/office",
  TECHNICIAN: "/tech",
  SALESPERSON: "/sales",
};

export async function requirePageRole(...roles: Role[]): Promise<SessionPayload> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}

export async function requirePageUser(): Promise<SessionPayload> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export { ROLE_HOME };
