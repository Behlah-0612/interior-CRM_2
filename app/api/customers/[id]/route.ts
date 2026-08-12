import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { customerSchema } from "@/lib/validation";
import { NotFoundError } from "@/lib/errors";

const patchSchema = customerSchema.partial();

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN", "OFFICE_STAFF");
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        properties: { orderBy: { label: "asc" } },
        quotes: { orderBy: { createdAt: "desc" }, take: 10 },
        invoices: { orderBy: { createdAt: "desc" }, take: 10 },
        soldBy: { select: { id: true, name: true } },
      },
    });
    if (!customer) throw new NotFoundError("Customer not found.");
    return NextResponse.json({ customer });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN", "OFFICE_STAFF");
    const { id } = await params;
    const body = patchSchema.parse(await req.json());

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Customer not found.");

    if (body.soldById) {
      const salesperson = await prisma.user.findFirst({
        where: { id: body.soldById, role: "SALESPERSON", active: true },
      });
      if (!salesperson) throw new NotFoundError("That salesperson couldn't be found.");
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.email !== undefined ? { email: body.email || null } : {}),
        ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
        ...(body.soldById !== undefined ? { soldById: body.soldById || null } : {}),
      },
      include: { soldBy: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ customer });
  } catch (error) {
    return handleApiError(error);
  }
}

// Hard delete. Admin only, since it cascades to this customer's properties,
// jobs, quotes, and invoices.
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Customer not found.");

    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
