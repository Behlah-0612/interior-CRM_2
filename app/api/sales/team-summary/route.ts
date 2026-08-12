import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { computeSalespersonSummaries } from "@/lib/sales";

// Every salesperson's revenue/commission numbers, for the admin
// commissions page (/admin/sales).
export async function GET() {
  try {
    await requireRole("ADMIN");
    const salespeople = await prisma.user.findMany({
      where: { role: "SALESPERSON" },
      select: { id: true },
    });
    const { summaries, tiers } = await computeSalespersonSummaries(salespeople.map((s) => s.id));
    return NextResponse.json({ summaries, tiers });
  } catch (error) {
    return handleApiError(error);
  }
}
