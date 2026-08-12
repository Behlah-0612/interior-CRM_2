import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { updateJobSchema, technicianJobUpdateSchema } from "@/lib/validation";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

const JOB_INCLUDE = {
  property: {
    select: {
      id: true,
      label: true,
      addressLine: true,
      city: true,
      accessNotes: true,
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          soldById: true,
          soldBy: { select: { id: true, name: true } },
        },
      },
    },
  },
  assignments: { include: { technician: { select: { id: true, name: true } } } },
  photos: { orderBy: { createdAt: "desc" as const } },
} as const;

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const job = await prisma.job.findUnique({ where: { id }, include: JOB_INCLUDE });
    if (!job) throw new NotFoundError("Job not found.");

    if (user.role === "TECHNICIAN") {
      const isAssigned = job.assignments.some((a) => a.technicianId === user.sub);
      if (!isAssigned) throw new NotFoundError("Job not found.");
    }

    if (user.role === "SALESPERSON" && job.property.customer.soldById !== user.sub) {
      throw new NotFoundError("Job not found.");
    }

    return NextResponse.json({ job });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const json = await req.json().catch(() => ({}));

    const existing = await prisma.job.findUnique({ where: { id }, include: { assignments: true } });
    if (!existing) throw new NotFoundError("Job not found.");

    // Technicians: can only flip status on a job they're assigned to.
    if (user.role === "TECHNICIAN") {
      const isAssigned = existing.assignments.some((a) => a.technicianId === user.sub);
      if (!isAssigned) throw new NotFoundError("Job not found.");

      const { status } = technicianJobUpdateSchema.parse(json);
      const job = await prisma.job.update({
        where: { id },
        data: { status, completedAt: status === "COMPLETED" ? new Date() : existing.completedAt },
        include: JOB_INCLUDE,
      });
      return NextResponse.json({ job });
    }

    if (user.role !== "ADMIN" && user.role !== "OFFICE_STAFF") {
      throw new ForbiddenError();
    }

    const body = updateJobSchema.parse(json);

    if (body.technicianIds) {
      const technicians = await prisma.user.findMany({
        where: { id: { in: body.technicianIds }, role: "TECHNICIAN", active: true },
        select: { id: true },
      });
      if (technicians.length !== body.technicianIds.length) {
        throw new NotFoundError("One or more selected technicians couldn't be found.");
      }
    }

    const job = await prisma.$transaction(async (tx) => {
      if (body.technicianIds) {
        await tx.jobAssignment.deleteMany({ where: { jobId: id } });
        if (body.technicianIds.length > 0) {
          await tx.jobAssignment.createMany({
            data: body.technicianIds.map((technicianId) => ({ jobId: id, technicianId })),
          });
        }
      }

      return tx.job.update({
        where: { id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description || null } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.scheduledAt !== undefined
            ? { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null }
            : {}),
          ...(body.priceCents !== undefined ? { priceCents: body.priceCents } : {}),
          ...(body.status === "COMPLETED" ? { completedAt: new Date() } : {}),
          ...(body.status && body.status !== "COMPLETED" ? { completedAt: null } : {}),
        },
        include: JOB_INCLUDE,
      });
    });

    return NextResponse.json({ job });
  } catch (error) {
    return handleApiError(error);
  }
}

// Admin only — jobs that already have an invoice can't be deleted (the
// database blocks it) so cancel the job instead in that case.
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;

    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Job not found.");

    await prisma.job.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
