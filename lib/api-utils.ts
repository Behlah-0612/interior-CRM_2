import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import { TooManyRequestsError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** Turn a thrown error into a well-formed JSON error response. */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Some fields aren't valid.", details: error.flatten() },
      { status: 400 }
    );
  }

  if (error instanceof TooManyRequestsError) {
    return NextResponse.json(
      { error: error.message },
      { status: 429, headers: { "Retry-After": String(Math.ceil(error.retryAfterSeconds)) } }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "That record wasn't found." }, { status: 404 });
    }
    if (error.code === "P2002") {
      return NextResponse.json({ error: "That value is already in use." }, { status: 409 });
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "This can't be removed because other records still depend on it." },
        { status: 409 }
      );
    }
  }

  if (error instanceof Error && "status" in error && typeof (error as { status: unknown }).status === "number") {
    const status = (error as { status: number }).status;
    return NextResponse.json({ error: error.message }, { status });
  }

  logger.error("Unhandled API error", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  return NextResponse.json({ error: "Something went wrong on our end." }, { status: 500 });
}
