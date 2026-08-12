import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { createInvoiceSchema, invoiceStatusSchema } from "@/lib/validation";
import { NotFoundError, BadRequestError } from "@/lib/errors";

const INVOICE_INCLUDE = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  lineItems: true,
  job: { select: { id: true, title: true } },
  quote: { select: { id: true } },
} as const;

export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN", "OFFICE_STAFF");
    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId") || undefined;
    const statusParam = url.searchParams.get("status");
    const status = statusParam ? invoiceStatusSchema.parse(statusParam) : undefined;

    const invoices = await prisma.invoice.findMany({
      where: { ...(customerId ? { customerId } : {}), ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      include: INVOICE_INCLUDE,
      take: 200,
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("ADMIN", "OFFICE_STAFF");
    const body = createInvoiceSchema.parse(await req.json());

    const customer = await prisma.customer.findUnique({ where: { id: body.customerId } });
    if (!customer) throw new NotFoundError("That customer doesn't exist.");

    if (body.jobId) {
      const job = await prisma.job.findUnique({ where: { id: body.jobId } });
      if (!job) throw new NotFoundError("That job doesn't exist.");
      const jobAlreadyInvoiced = await prisma.invoice.findUnique({ where: { jobId: body.jobId } });
      if (jobAlreadyInvoiced) throw new BadRequestError("That job already has an invoice.");
    }

    if (body.quoteId) {
      const quote = await prisma.quote.findUnique({ where: { id: body.quoteId } });
      if (!quote) throw new NotFoundError("That quote doesn't exist.");
      const quoteAlreadyInvoiced = await prisma.invoice.findUnique({ where: { quoteId: body.quoteId } });
      if (quoteAlreadyInvoiced) throw new BadRequestError("That quote already has an invoice.");
    }

    const invoice = await prisma.invoice.create({
      data: {
        customerId: body.customerId,
        jobId: body.jobId || null,
        quoteId: body.quoteId || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes || null,
        createdById: user.sub,
        lineItems: { create: body.lineItems },
      },
      include: INVOICE_INCLUDE,
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
