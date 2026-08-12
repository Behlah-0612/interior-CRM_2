import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { propertySchema } from "@/lib/validation";
import { NotFoundError } from "@/lib/errors";

const patchSchema = propertySchema.omit({ customerId: true }).partial();

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN", "OFFICE_STAFF");
    const { id } = await params;
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        jobs: { orderBy: { scheduledAt: "desc" }, take: 20 },
      },
    });
    if (!property) throw new NotFoundError("Property not found.");
    return NextResponse.json({ property });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN", "OFFICE_STAFF");
    const { id } = await params;
    const body = patchSchema.parse(await req.json());

    const existing = await prisma.property.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Property not found.");

    const property = await prisma.property.update({
      where: { id },
      data: {
        ...(body.label !== undefined ? { label: body.label } : {}),
        ...(body.addressLine !== undefined ? { addressLine: body.addressLine } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
        ...(body.province !== undefined ? { province: body.province } : {}),
        ...(body.postalCode !== undefined ? { postalCode: body.postalCode || null } : {}),
        ...(body.accessNotes !== undefined ? { accessNotes: body.accessNotes || null } : {}),
      },
    });
    return NextResponse.json({ property });
  } catch (error) {
    return handleApiError(error);
  }
}

// Hard delete. Admin only, since it cascades to this property's jobs.
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;

    const existing = await prisma.property.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Property not found.");

    await prisma.property.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
