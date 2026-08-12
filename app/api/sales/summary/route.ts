import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { computeSalespersonSummaries } from "@/lib/sales";

// A salesperson's own revenue/commission numbers (used by /sales).
export async function GET() {
  try {
    const user = await requireRole("ADMIN", "SALESPERSON");
    const { summaries, tiers } = await computeSalespersonSummaries([user.sub]);
    return NextResponse.json({ summary: summaries[0] ?? null, tiers });
  } catch (error) {
    return handleApiError(error);
  }
}
