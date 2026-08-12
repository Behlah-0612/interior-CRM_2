import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";

// A lightweight technician picker list for the job-assignment UI.
// Office + Admin only need this (to build a crew), not the full user
// record — just enough to build a picker.
export async function GET() {
  try {
    await requireRole("ADMIN", "OFFICE_STAFF");
    const technicians = await prisma.user.findMany({
      where: { role: "TECHNICIAN", active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ technicians });
  } catch (error) {
    return handleApiError(error);
  }
}
