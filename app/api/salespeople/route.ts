import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";

// A lightweight salesperson picker list — used when assigning who sold a
// customer account. Office + Admin only.
export async function GET() {
  try {
    await requireRole("ADMIN", "OFFICE_STAFF");
    const salespeople = await prisma.user.findMany({
      where: { role: "SALESPERSON", active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ salespeople });
  } catch (error) {
    return handleApiError(error);
  }
}
