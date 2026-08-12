import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { customerSchema, paginationSchema } from "@/lib/validation";
import { NotFoundError } from "@/lib/errors";

const CUSTOMER_LIST_INCLUDE = {
  _count: { select: { properties: true } },
  soldBy: { select: { id: true, name: true } },
} as const;

// List customers, optionally searching by name/email/phone, or filtering
// to accounts sold by one salesperson. Office + Admin.
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN", "OFFICE_STAFF");

    const url = new URL(req.url);
    const { page, pageSize } = paginationSchema.parse(Object.fromEntries(url.searchParams));
    const q = url.searchParams.get("q")?.trim();
    const salespersonId = url.searchParams.get("salespersonId") || undefined;

    const where = {
      ...(salespersonId ? { soldById: salespersonId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
              { phone: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: CUSTOMER_LIST_INCLUDE,
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({ customers, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

// Create a customer. Office + Admin.
export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN", "OFFICE_STAFF");
    const body = customerSchema.parse(await req.json());

    if (body.soldById) {
      const salesperson = await prisma.user.findFirst({
        where: { id: body.soldById, role: "SALESPERSON", active: true },
      });
      if (!salesperson) throw new NotFoundError("That salesperson couldn't be found.");
    }

    const customer = await prisma.customer.create({
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        notes: body.notes || null,
        soldById: body.soldById || null,
      },
      include: CUSTOMER_LIST_INCLUDE,
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
