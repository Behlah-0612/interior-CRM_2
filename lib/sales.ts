import "server-only";
import { prisma } from "@/lib/prisma";
import { effectiveRateBps, commissionCentsFor } from "@/lib/commission";

export interface SalespersonSummary {
  id: string;
  name: string;
  email: string;
  totalRevenueCents: number;
  jobCount: number;
  manualRateBps: number | null;
  effectiveRateBps: number;
  estimatedCommissionCents: number;
}

// Shared by /api/sales/summary (a salesperson's own numbers) and
// /api/sales/team-summary (admin's view of everyone). Revenue = sum of
// Job.priceCents for every non-cancelled job under an account (Customer)
// this person sold — see Customer.soldById in prisma/schema.prisma.
export async function computeSalespersonSummaries(userIds: string[]): Promise<{
  summaries: SalespersonSummary[];
  tiers: { id: string; name: string; minRevenueCents: number; rateBps: number }[];
}> {
  if (userIds.length === 0) {
    const tiers = await prisma.commissionTier.findMany({
      where: { active: true },
      orderBy: { minRevenueCents: "asc" },
    });
    return { summaries: [], tiers };
  }

  const [users, tiers] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, commissionRateBps: true },
      orderBy: { name: "asc" },
    }),
    prisma.commissionTier.findMany({ where: { active: true }, orderBy: { minRevenueCents: "asc" } }),
  ]);

  const summaries = await Promise.all(
    users.map(async (u) => {
      const agg = await prisma.job.aggregate({
        where: {
          status: { not: "CANCELLED" },
          property: { customer: { soldById: u.id } },
        },
        _sum: { priceCents: true },
        _count: true,
      });
      const totalRevenueCents = agg._sum.priceCents ?? 0;
      const rate = effectiveRateBps(totalRevenueCents, u.commissionRateBps, tiers);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        totalRevenueCents,
        jobCount: agg._count,
        manualRateBps: u.commissionRateBps,
        effectiveRateBps: rate,
        estimatedCommissionCents: commissionCentsFor(totalRevenueCents, rate),
      };
    })
  );

  return { summaries, tiers };
}
