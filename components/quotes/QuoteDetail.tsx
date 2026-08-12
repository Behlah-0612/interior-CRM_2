"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { LineItemsEditor, type LineItem } from "@/components/LineItemsEditor";

interface QuoteFull {
  id: string;
  status: string;
  notes: string | null;
  customer: { id: string; name: string };
  lineItems: LineItem[];
}

const STATUS_OPTIONS = ["DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"];

export function QuoteDetail({ id }: { id: string }) {
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteFull | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ quote: QuoteFull }>(`/api/quotes/${id}`);
      setQuote(data.quote);
      setLineItems(data.quote.lineItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this quote.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveStatus(status: string) {
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ quote: QuoteFull }>(`/api/quotes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setQuote(data.quote);
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
      const data = await apiFetch<{ quote: QuoteFull }>(`/api/quotes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ lineItems }),
      });
      setQuote(data.quote);
      setLineItems(data.quote.lineItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save line items.");
    } finally {
      setSaving(false);
    }
  }

  async function convertToInvoice() {
    if (!quote) return;
    setConverting(true);
    setError(null);
    try {
      const data = await apiFetch<{ invoice: { id: string } }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          customerId: quote.customer.id,
          quoteId: quote.id,
          lineItems: quote.lineItems,
        }),
      });
      router.push(`/office/invoices/${data.invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create invoice.");
    } finally {
      setConverting(false);
    }
  }

  if (error && !quote) return <p className="rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>;
  if (!quote) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/office/quotes" className="text-sm text-muted hover:text-foreground">
          ← Quotes
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
            <Link href={`/office/customers/${quote.customer.id}`} className="text-accent hover:underline">
              {quote.customer.name}
            </Link>
          </h1>
          <StatusBadge status={quote.status} />
        </div>
      </div>

      {error && <p className="rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="rounded-lg border border-border bg-surface p-4">
        <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
        <select
          value={quote.status}
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

      {quote.status === "ACCEPTED" && (
        <button
          onClick={convertToInvoice}
          disabled={converting}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {converting ? "Creating…" : "Convert to Invoice"}
        </button>
      )}
    </div>
  );
}
