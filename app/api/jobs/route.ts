import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { createJobSchema, jobStatusSchema } from "@/lib/validation";
import { NotFoundError } from "@/lib/errors";

const JOB_INCLUDE = {
  property: {
    select: {
      id: true,
      label: true,
      addressLine: true,
      city: true,
      customer: {
        select: { id: true, name: true, phone: true, soldBy: { select: { id: true, name: true } } },
      },
    },
  },
  assignments: { include: { technician: { select: { id: true, name: true } } } },
} as const;

// List jobs. Admin/Office see everything (with optional filters).
// Technicians only ever see jobs they're assigned to. Salespeople only
// ever see jobs under accounts (customers) they sold.
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);

    const statusParam = url.searchParams.get("status");
    const status = statusParam ? jobStatusSchema.parse(statusParam) : undefined;
    const propertyId = url.searchParams.get("propertyId") || undefined;
    const technicianIdFilter = url.searchParams.get("technicianId") || undefined;
    const salespersonIdFilter = url.searchParams.get("salespersonId") || undefined;

    const where: Record<string, unknown> = {
      ...(status ? { status } : {}),
      ...(propertyId ? { propertyId } : {}),
    };

    if (user.role === "TECHNICIAN") {
      where.assignments = { some: { technicianId: user.sub } };
    } else if (user.role === "SALESPERSON") {
      where.property = { customer: { soldById: user.sub } };
    } else {
      if (technicianIdFilter) where.assignments = { some: { technicianId: technicianIdFilter } };
      if (salespersonIdFilter) where.property = { customer: { soldById: salespersonIdFilter } };
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      include: JOB_INCLUDE,
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    return handleApiError(error);
  }
}

// Create a job (schedule work at a property, optionally assigning a crew).
// Office + Admin only.
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("ADMIN", "OFFICE_STAFF");
    const body = createJobSchema.parse(await req.json());

    const property = await prisma.property.findUnique({ where: { id: body.propertyId } });
    if (!property) throw new NotFoundError("That property doesn't exist.");

    if (body.technicianIds.length > 0) {
      const technicians = await prisma.user.findMany({
        where: { id: { in: body.technicianIds }, role: "TECHNICIAN", active: true },
        select: { id: true },
      });
      if (technicians.length !== body.technicianIds.length) {
        throw new NotFoundError("One or more selected technicians couldn't be found.");
      }
    }

    const job = await prisma.job.create({
      data: {
        propertyId: body.propertyId,
        title: body.title,
        description: body.description || null,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        status: body.scheduledAt ? "SCHEDULED" : "UNSCHEDULED",
        priceCents: body.priceCents ?? null,
        createdById: user.sub,
        assignments: {
          create: body.technicianIds.map((technicianId) => ({ technicianId })),
        },
      },
      include: JOB_INCLUDE,
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
