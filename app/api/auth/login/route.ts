import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSession, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { handleApiError } from "@/lib/api-utils";
import { TooManyRequestsError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const ip = requestIp(req);

    // Rate limit by IP so brute-forcing a password is impractical.
    const { allowed, retryAfterMs } = rateLimit(`login:${ip}`, LOGIN_ATTEMPT_LIMIT, LOGIN_WINDOW_MS);
    if (!allowed) {
      throw new TooManyRequestsError(
        retryAfterMs / 1000,
        "Too many login attempts. Please wait a few minutes and try again."
      );
    }

    const json = await req.json().catch(() => null);
    const { email, password } = loginSchema.parse(json);
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Same generic error whether the email doesn't exist or the password is
    // wrong — don't reveal which one it was.
    const genericError = () =>
      NextResponse.json({ error: "That email or password isn't right." }, { status: 401 });

    if (!user || !user.active) {
      logger.warn("Login failed", { email: normalizedEmail, ip, reason: user ? "inactive" : "no_such_user" });
      await prisma.auditLog
        .create({ data: { action: "LOGIN_FAILED", ip, metadata: { email: normalizedEmail } } })
        .catch(() => {});
      return genericError();
    }

    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) {
      logger.warn("Login failed", { userId: user.id, ip, reason: "bad_password" });
      await prisma.auditLog
        .create({ data: { userId: user.id, action: "LOGIN_FAILED", ip } })
        .catch(() => {});
      return genericError();
    }

    const token = await signSession({
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
    res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());

    logger.info("Login succeeded", { userId: user.id, ip });
    await prisma.auditLog
      .create({ data: { userId: user.id, action: "LOGIN_SUCCESS", ip } })
      .catch(() => {});

    return res;
  } catch (error) {
    return handleApiError(error);
  }
}
