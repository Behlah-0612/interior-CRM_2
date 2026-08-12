import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { createUserSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";

const SELECT_FIELDS = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

// List all staff accounts. Admin only.
export async function GET() {
  try {
    await requireRole("ADMIN");
    const users = await prisma.user.findMany({
      select: SELECT_FIELDS,
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ users });
  } catch (error) {
    return handleApiError(error);
  }
}

// Create a new staff account. Admin only.
export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const body = createUserSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        phone: body.phone || null,
        role: body.role,
        passwordHash,
      },
      select: SELECT_FIELDS,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
