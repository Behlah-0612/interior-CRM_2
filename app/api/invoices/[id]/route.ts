import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { updateInvoiceSchema } from "@/lib/validation";
import { NotFoundError } from "@/lib/errors";

const INVOICE_INCLUDE = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  lineItems: true,
  job: { select: { id: true, title: true } },
  quote: { select: { id: true } },
} as const;

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN", "OFFICE_STAFF");
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({ where: { id }, include: INVOICE_INCLUDE });
    if (!invoice) throw new NotFoundError("Invoice not found.");
    return NextResponse.json({ invoice });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN", "OFFICE_STAFF");
    const { id } = await params;
    const body = updateInvoiceSchema.parse(await req.json());

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Invoice not found.");

    const invoice = await prisma.$transaction(async (tx) => {
      if (body.lineItems) {
        await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
        await tx.invoiceLineItem.createMany({
          data: body.lineItems.map((item) => ({ ...item, invoiceId: id })),
        });
      }
      return tx.invoice.update({
        where: { id },
        data: {
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.dueDate !== undefined ? { dueDate: body.dueDate ? new Date(body.dueDate) : null } : {}),
          ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
          ...(body.status === "PAID" ? { paidAt: new Date() } : {}),
        },
        include: INVOICE_INCLUDE,
      });
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    return handleApiError(error);
  }
}

// Admin only. We void invoices rather than delete them — an invoice is a
// financial record and shouldn't just disappear.
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Invoice not found.");
    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status: "VOID" },
      include: INVOICE_INCLUDE,
    });
    return NextResponse.json({ invoice });
  } catch (error) {
    return handleApiError(error);
  }
}
