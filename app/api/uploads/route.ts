import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";
import { BadRequestError, TooManyRequestsError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

// No cloud storage (S3, Vercel Blob, Cloudinary, etc.) is configured for
// this project yet, so uploads are encoded as base64 data URLs and stored
// directly on the JobPhoto record. That's fine for a handful of job
// photos, but doesn't scale well to a large photo library — if photo
// volume grows, swap this for real object storage and just store the
// returned URL here instead.
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    // Uploads are the most storage/compute-expensive thing a signed-in
    // user can do (base64-encoding files into the database), so they get
    // their own, more generous limit than login.
    const { allowed, retryAfterMs } = rateLimit(`upload:${user.sub}`, 30, 10 * 60 * 1000);
    if (!allowed) {
      throw new TooManyRequestsError(retryAfterMs / 1000, "Too many uploads. Please wait a bit and try again.");
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new BadRequestError("No file was uploaded.");
    }
    if (file.size === 0) {
      throw new BadRequestError("That file is empty.");
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestError("That photo is too large (5MB max).");
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new BadRequestError("Only JPEG, PNG, WEBP, or HEIC photos are supported.");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const url = `data:${file.type};base64,${bytes.toString("base64")}`;

    return NextResponse.json({ url });
  } catch (error) {
    return handleApiError(error);
  }
}
