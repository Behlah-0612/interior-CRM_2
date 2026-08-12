import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { updateCommissionTierSchema } from "@/lib/validation";
import { NotFoundError } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;
    const body = updateCommissionTierSchema.parse(await req.json());

    const existing = await prisma.commissionTier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Commission tier not found.");

    const tier = await prisma.commissionTier.update({ where: { id }, data: body });
    return NextResponse.json({ tier });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;
    const existing = await prisma.commissionTier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Commission tier not found.");
    await prisma.commissionTier.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
