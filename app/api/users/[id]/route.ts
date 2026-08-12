import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { updateUserSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";
import { NotFoundError, BadRequestError } from "@/lib/errors";

const SELECT_FIELDS = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  active: true,
  commissionRateBps: true,
  createdAt: true,
} as const;

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id }, select: SELECT_FIELDS });
    if (!user) throw new NotFoundError("Staff account not found.");
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

// Update role, active status, contact info, or reset a password. Admin only.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const admin = await requireRole("ADMIN");
    const { id } = await params;
    const body = updateUserSchema.parse(await req.json());

    if (id === admin.sub && (body.active === false || (body.role && body.role !== "ADMIN"))) {
      throw new BadRequestError("You can't deactivate or demote your own account.");
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Staff account not found.");

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.phone !== undefined) data.phone = body.phone || null;
    if (body.role !== undefined) data.role = body.role;
    if (body.active !== undefined) data.active = body.active;
    if (body.commissionRateBps !== undefined) data.commissionRateBps = body.commissionRateBps;
    if (body.password) data.passwordHash = await hashPassword(body.password);

    const user = await prisma.user.update({ where: { id }, data, select: SELECT_FIELDS });
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

// "Delete" a staff account. We deactivate rather than hard-delete so past
// jobs/quotes/invoices they created keep a valid record of who made them.
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const admin = await requireRole("ADMIN");
    const { id } = await params;

    if (id === admin.sub) {
      throw new BadRequestError("You can't deactivate your own account.");
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Staff account not found.");

    await prisma.user.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
