import { describe, it, expect } from "vitest";
import {
  effectiveRateBps,
  commissionCentsFor,
  nextTier,
  bpsToPercentString,
  percentStringToBps,
} from "./commission";

const tiers = [
  { minRevenueCents: 1_000_000, rateBps: 1200 }, // $10,000 -> 12%
  { minRevenueCents: 2_500_000, rateBps: 1500 }, // $25,000 -> 15%
];

describe("effectiveRateBps", () => {
  it("falls back to the manual rate when no tier is reached", () => {
    expect(effectiveRateBps(500_000, 1000, tiers)).toBe(1000);
  });

  it("falls back to 0 when there's no manual rate and no tier applies", () => {
    expect(effectiveRateBps(500_000, null, tiers)).toBe(0);
  });

  it("uses the qualifying tier once its threshold is reached", () => {
    expect(effectiveRateBps(1_000_000, 1000, tiers)).toBe(1200);
  });

  it("uses the highest qualifying tier, not just the first", () => {
    expect(effectiveRateBps(3_000_000, 1000, tiers)).toBe(1500);
  });

  it("is inclusive at the exact threshold", () => {
    expect(effectiveRateBps(2_500_000, 1000, tiers)).toBe(1500);
  });
});

describe("commissionCentsFor", () => {
  it("computes rate * revenue correctly", () => {
    expect(commissionCentsFor(1_000_000, 1200)).toBe(120_000); // 12% of $10,000 = $1,200
  });

  it("rounds to the nearest cent", () => {
    expect(commissionCentsFor(333, 1000)).toBe(33); // 10% of $3.33 = $0.333 -> rounds to 33
  });

  it("is zero at a zero rate", () => {
    expect(commissionCentsFor(1_000_000, 0)).toBe(0);
  });
});

describe("nextTier", () => {
  it("returns the closest tier not yet reached", () => {
    expect(nextTier(500_000, tiers)).toEqual(tiers[0]);
  });

  it("returns null once every tier has been reached", () => {
    expect(nextTier(3_000_000, tiers)).toBeNull();
  });
});

describe("bpsToPercentString / percentStringToBps", () => {
  it("round-trips a percentage", () => {
    expect(bpsToPercentString(1250)).toBe("12.50%");
    expect(percentStringToBps("12.5")).toBe(1250);
  });

  it("rejects invalid input", () => {
    expect(percentStringToBps("not a number")).toBeNull();
    expect(percentStringToBps("-5")).toBeNull();
  });
});
