import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { propertySchema } from "@/lib/validation";
import { NotFoundError } from "@/lib/errors";

// List properties, optionally filtered by customer. Office + Admin.
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN", "OFFICE_STAFF");
    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId") || undefined;

    const properties = await prisma.property.findMany({
      where: customerId ? { customerId } : {},
      orderBy: { label: "asc" },
      include: { customer: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ properties });
  } catch (error) {
    return handleApiError(error);
  }
}

// Create a property for a customer. Office + Admin.
export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN", "OFFICE_STAFF");
    const body = propertySchema.parse(await req.json());

    const customer = await prisma.customer.findUnique({ where: { id: body.customerId } });
    if (!customer) throw new NotFoundError("That customer doesn't exist.");

    const property = await prisma.property.create({
      data: {
        customerId: body.customerId,
        label: body.label,
        addressLine: body.addressLine,
        city: body.city,
        province: body.province,
        postalCode: body.postalCode || null,
        accessNotes: body.accessNotes || null,
      },
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
