import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { handleApiError } from "@/lib/api-utils";

// High-level operational numbers for the Admin overview page.
export async function GET() {
  try {
    await requireRole("ADMIN");

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const [
      jobsToday,
      jobsScheduledCount,
      jobsInProgressCount,
      unpaidInvoices,
      totalCustomers,
      activeStaff,
      pendingQuotes,
    ] = await Promise.all([
      prisma.job.count({ where: { scheduledAt: { gte: startOfToday, lt: endOfToday } } }),
      prisma.job.count({ where: { status: "SCHEDULED" } }),
      prisma.job.count({ where: { status: "IN_PROGRESS" } }),
      prisma.invoice.findMany({
        where: { status: { in: ["SENT", "OVERDUE"] } },
        include: { lineItems: true },
      }),
      prisma.customer.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.quote.count({ where: { status: "SENT" } }),
    ]);

    const unpaidTotalCents = unpaidInvoices.reduce(
      (sum, inv) => sum + inv.lineItems.reduce((s, li) => s + li.quantity * li.unitPriceCents, 0),
      0
    );

    return NextResponse.json({
      jobsToday,
      jobsScheduled: jobsScheduledCount,
      jobsInProgress: jobsInProgressCount,
      unpaidInvoiceCount: unpaidInvoices.length,
      unpaidTotalCents,
      totalCustomers,
      activeStaff,
      pendingQuotes,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
