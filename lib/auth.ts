// Password hashing and session-token (JWT) helpers.
//
// This file must stay Edge-runtime safe (no Node-only APIs) because it's
// imported by proxy.ts, which runs on the Edge runtime. `jose` is a
// pure-JS/WebCrypto JWT library and works there; `bcryptjs` is pure JS too.

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export type Role = "ADMIN" | "OFFICE_STAFF" | "TECHNICIAN" | "SALESPERSON";

export const ROLES: Role[] = ["ADMIN", "OFFICE_STAFF", "TECHNICIAN", "SALESPERSON"];

export interface SessionPayload {
  sub: string; // user id
  role: Role;
  name: string;
  email: string;
}

export const SESSION_COOKIE_NAME = "ihs_session";

// How long a login stays valid before the user has to sign in again.
const SESSION_DURATION = "12h";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_SECRET is missing or too short. Add a long random value to your .env file " +
        "(generate one with: openssl rand -base64 32)."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, name: payload.name, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.sub || !payload.role) return null;
    return {
      sub: payload.sub as string,
      role: payload.role as Role,
      name: payload.name as string,
      email: payload.email as string,
    };
  } catch {
    // Expired, malformed, or tampered-with token — treat as "not signed in".
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
