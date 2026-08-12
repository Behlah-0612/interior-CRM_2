import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySession, type Role } from "@/lib/auth";

// Where each role lands after login / when it hits a page it can't use.
const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  OFFICE_STAFF: "/office",
  TECHNICIAN: "/tech",
  SALESPERSON: "/sales",
};

// Which roles may view which section of the app.
const PROTECTED_PREFIXES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/office", roles: ["ADMIN", "OFFICE_STAFF"] },
  { prefix: "/tech", roles: ["ADMIN", "TECHNICIAN"] },
  { prefix: "/sales", roles: ["ADMIN", "SALESPERSON"] },
];

// NOTE: this proxy (formerly called "middleware") protects *pages*
// (redirects for a good UX). It is not the source of truth for security —
// every API route independently checks the session and role again with
// requireRole() before touching data, since this can be bypassed by
// calling the API directly.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  const matched = PROTECTED_PREFIXES.find((p) => pathname.startsWith(p.prefix));

  if (matched) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (!matched.roles.includes(session.role)) {
      const url = req.nextUrl.clone();
      url.pathname = ROLE_HOME[session.role];
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/login" && session) {
    const url = req.nextUrl.clone();
    url.pathname = ROLE_HOME[session.role];
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/office/:path*", "/tech/:path*", "/sales/:path*", "/login"],
};
