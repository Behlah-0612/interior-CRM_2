import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { createJobPhotoSchema } from "@/lib/validation";
import { NotFoundError } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

async function assertJobVisible(jobId: string, user: { sub: string; role: string }) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { assignments: true },
  });
  if (!job) throw new NotFoundError("Job not found.");
  if (user.role === "TECHNICIAN" && !job.assignments.some((a) => a.technicianId === user.sub)) {
    throw new NotFoundError("Job not found.");
  }
  return job;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id: jobId } = await params;
    await assertJobVisible(jobId, user);

    const photos = await prisma.jobPhoto.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ photos });
  } catch (error) {
    return handleApiError(error);
  }
}

// Attach a photo (already uploaded to storage — this just records the URL).
// Any signed-in role can upload to a job they can see: Admin/Office for any
// job, Technicians only for jobs they're assigned to.
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id: jobId } = await params;
    await assertJobVisible(jobId, user);

    const body = createJobPhotoSchema.parse(await req.json());

    const photo = await prisma.jobPhoto.create({
      data: {
        jobId,
        url: body.url,
        caption: body.caption || null,
        uploadedById: user.sub,
      },
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
