import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { updateQuoteSchema } from "@/lib/validation";
import { NotFoundError } from "@/lib/errors";

const QUOTE_INCLUDE = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  lineItems: true,
} as const;

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN", "OFFICE_STAFF");
    const { id } = await params;
    const quote = await prisma.quote.findUnique({ where: { id }, include: QUOTE_INCLUDE });
    if (!quote) throw new NotFoundError("Quote not found.");
    return NextResponse.json({ quote });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN", "OFFICE_STAFF");
    const { id } = await params;
    const body = updateQuoteSchema.parse(await req.json());

    const existing = await prisma.quote.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Quote not found.");

    const quote = await prisma.$transaction(async (tx) => {
      if (body.lineItems) {
        await tx.quoteLineItem.deleteMany({ where: { quoteId: id } });
        await tx.quoteLineItem.createMany({
          data: body.lineItems.map((item) => ({ ...item, quoteId: id })),
        });
      }
      return tx.quote.update({
        where: { id },
        data: {
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
          ...(body.validUntil !== undefined
            ? { validUntil: body.validUntil ? new Date(body.validUntil) : null }
            : {}),
        },
        include: QUOTE_INCLUDE,
      });
    });

    return NextResponse.json({ quote });
  } catch (error) {
    return handleApiError(error);
  }
}

// Admin only. Quotes already turned into an invoice can't be deleted (the
// database blocks it) — void the invoice or decline the quote instead.
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;
    const existing = await prisma.quote.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Quote not found.");
    await prisma.quote.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
