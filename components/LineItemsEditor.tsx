"use client";

import { centsToDollarsString, sumLineItemsCents } from "@/lib/money";

export interface LineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export function LineItemsEditor({
  items,
  onChange,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}) {
  function update(index: number, patch: Partial<LineItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...items, { description: "", quantity: 1, unitPriceCents: 0 }]);
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-foreground">Line items</p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input
              placeholder="Description"
              value={item.description}
              onChange={(e) => update(i, { description: e.target.value })}
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => update(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-20 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              title="Quantity"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Price"
              value={item.unitPriceCents ? (item.unitPriceCents / 100).toString() : ""}
              onChange={(e) => update(i, { unitPriceCents: Math.round((parseFloat(e.target.value) || 0) * 100) })}
              className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              title="Unit price"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={items.length <= 1}
              className="rounded-md px-2 py-2 text-sm text-danger hover:bg-danger-bg disabled:opacity-30"
              aria-label="Remove line item"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 text-sm font-medium text-accent hover:underline"
      >
        + Add line item
      </button>
      <p className="mt-2 text-right text-sm font-medium text-foreground">
        Total: {centsToDollarsString(sumLineItemsCents(items))}
      </p>
    </div>
  );
}
