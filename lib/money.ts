// Shared helpers for working with money stored as integer cents.

export function centsToDollarsString(cents: number | null | undefined): string {
  if (cents == null) return "$0.00";
  return (cents / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

export function sumLineItemsCents(items: { quantity: number; unitPriceCents: number }[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
}
