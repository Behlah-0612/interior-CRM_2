import { describe, it, expect } from "vitest";
import { centsToDollarsString, sumLineItemsCents } from "./money";

describe("centsToDollarsString", () => {
  it("formats cents as CAD currency", () => {
    expect(centsToDollarsString(150000)).toBe("$1,500.00");
    expect(centsToDollarsString(0)).toBe("$0.00");
  });

  it("treats null/undefined as zero", () => {
    expect(centsToDollarsString(null)).toBe("$0.00");
    expect(centsToDollarsString(undefined)).toBe("$0.00");
  });
});

describe("sumLineItemsCents", () => {
  it("sums quantity * unit price across line items", () => {
    const total = sumLineItemsCents([
      { quantity: 2, unitPriceCents: 1000 },
      { quantity: 1, unitPriceCents: 500 },
    ]);
    expect(total).toBe(2500);
  });

  it("returns 0 for an empty list", () => {
    expect(sumLineItemsCents([])).toBe(0);
  });
});
