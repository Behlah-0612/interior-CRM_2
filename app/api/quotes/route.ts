import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { createQuoteSchema, quoteStatusSchema } from "@/lib/validation";
import { NotFoundError } from "@/lib/errors";

const QUOTE_INCLUDE = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  lineItems: true,
} as const;

export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN", "OFFICE_STAFF");
    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId") || undefined;
    const statusParam = url.searchParams.get("status");
    const status = statusParam ? quoteStatusSchema.parse(statusParam) : undefined;

    const quotes = await prisma.quote.findMany({
      where: { ...(customerId ? { customerId } : {}), ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      include: QUOTE_INCLUDE,
      take: 200,
    });

    return NextResponse.json({ quotes });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("ADMIN", "OFFICE_STAFF");
    const body = createQuoteSchema.parse(await req.json());

    const customer = await prisma.customer.findUnique({ where: { id: body.customerId } });
    if (!customer) throw new NotFoundError("That customer doesn't exist.");

    const quote = await prisma.quote.create({
      data: {
        customerId: body.customerId,
        notes: body.notes || null,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        createdById: user.sub,
        lineItems: { create: body.lineItems },
      },
      include: QUOTE_INCLUDE,
    });

    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
