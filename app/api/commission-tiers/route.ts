import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { commissionTierSchema } from "@/lib/validation";

// Admin-managed automatic commission tiers. See lib/commission.ts for how
// these combine with a salesperson's manual rate.
export async function GET() {
  try {
    await requireRole("ADMIN");
    const tiers = await prisma.commissionTier.findMany({ orderBy: { minRevenueCents: "asc" } });
    return NextResponse.json({ tiers });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const body = commissionTierSchema.parse(await req.json());
    const tier = await prisma.commissionTier.create({ data: body });
    return NextResponse.json({ tier }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
