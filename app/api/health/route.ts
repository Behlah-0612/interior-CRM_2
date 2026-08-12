import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Plug this into an uptime monitor (UptimeRobot, Better Uptime, a Vercel
// cron, etc.) to get alerted if the app or database goes down. No auth
// required — it deliberately reveals nothing about the data, just "up" or
// "down".
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", time: new Date().toISOString() });
  } catch (error) {
    logger.error("Health check failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
