"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { LineItemsEditor, type LineItem } from "@/components/LineItemsEditor";

interface InvoiceFull {
  id: string;
  status: string;
  dueDate: string | null;
  notes: string | null;
  customer: { id: string; name: string; email: string | null; phone: string | null };
  job: { id: string; title: string } | null;
  lineItems: LineItem[];
}

const STATUS_OPTIONS = ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"];

export function InvoiceDetail({ id }: { id: string }) {
  const [invoice, setInvoice] = useState<InvoiceFull | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ invoice: InvoiceFull }>(`/api/invoices/${id}`);
      setInvoice(data.invoice);
      setLineItems(data.invoice.lineItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this invoice.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveStatus(status: string) {
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ invoice: InvoiceFull }>(`/api/invoices/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setInvoice(data.invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update status.");
    } finally {
      setSaving(false);
    }
  }

  async function saveLineItems() {
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ invoice: InvoiceFull }>(`/api/invoices/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ lineItems }),
      });
      setInvoice(data.invoice);
      setLineItems(data.invoice.lineItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save line items.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !invoice) return <p className="rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>;
  if (!invoice) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/office/invoices" className="text-sm text-muted hover:text-foreground">
          ← Invoices
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
            <Link href={`/office/customers/${invoice.customer.id}`} className="text-accent hover:underline">
              {invoice.customer.name}
            </Link>
          </h1>
          <StatusBadge status={invoice.status} />
        </div>
        {invoice.job && <p className="mt-1 text-sm text-muted">For job: {invoice.job.title}</p>}
      </div>

      {error && <p className="rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="rounded-lg border border-border bg-surface p-4">
        <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
        <select
          value={invoice.status}
          disabled={saving}
          onChange={(e) => saveStatus(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <LineItemsEditor items={lineItems} onChange={setLineItems} />
        <button
          onClick={saveLineItems}
          disabled={saving}
          className="mt-3 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          Save Line Items
        </button>
      </div>
    </div>
  );
}
