// Sales commission math. Rates are stored/passed as basis points (bps):
// 1000 bps = 10.00%. Money is in integer cents throughout, matching the
// rest of the app (see lib/money.ts).
//
// Model: each salesperson has a manual base rate (admin-set, per person).
// Admin also manages a shared list of revenue tiers — once a salesperson's
// total revenue sold (all-time, across every account they sold) reaches a
// tier's threshold, that tier's rate REPLACES their manual rate entirely
// (not a marginal/bracketed calculation — whichever qualifying tier has
// the highest threshold wins). If no tier applies, the manual rate is
// used; if neither is set, the rate is 0.

export interface CommissionTierLike {
  minRevenueCents: number;
  rateBps: number;
}

export function effectiveRateBps(
  totalRevenueCents: number,
  manualRateBps: number | null | undefined,
  tiers: CommissionTierLike[]
): number {
  const qualifying = tiers
    .filter((t) => totalRevenueCents >= t.minRevenueCents)
    .sort((a, b) => b.minRevenueCents - a.minRevenueCents);
  if (qualifying.length > 0) return qualifying[0].rateBps;
  return manualRateBps ?? 0;
}

export function commissionCentsFor(totalRevenueCents: number, rateBps: number): number {
  return Math.round((totalRevenueCents * rateBps) / 10000);
}

/** The next tier a salesperson hasn't reached yet, if any (for "progress to next tier" UI). */
export function nextTier<T extends CommissionTierLike>(
  totalRevenueCents: number,
  tiers: T[]
): T | null {
  const upcoming = tiers
    .filter((t) => totalRevenueCents < t.minRevenueCents)
    .sort((a, b) => a.minRevenueCents - b.minRevenueCents);
  return upcoming[0] ?? null;
}

export function bpsToPercentString(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

/** Parse a user-typed percentage (e.g. "12.5") into basis points (1250). Returns null if invalid. */
export function percentStringToBps(input: string): number | null {
  const value = parseFloat(input);
  if (Number.isNaN(value) || value < 0) return null;
  return Math.round(value * 100);
}
