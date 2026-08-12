"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { centsToDollarsString, sumLineItemsCents } from "@/lib/money";
import { LineItemsEditor, type LineItem } from "@/components/LineItemsEditor";

interface QuoteListItem {
  id: string;
  status: string;
  createdAt: string;
  customer: { name: string };
  lineItems: { quantity: number; unitPriceCents: number }[];
}

interface CustomerOption {
  id: string;
  name: string;
}

export function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ quotes: QuoteListItem[] }>("/api/quotes");
      setQuotes(data.quotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load quotes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">Quotes</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          {showForm ? "Cancel" : "+ New Quote"}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-4">
          <NewQuoteForm
            onCreated={() => {
              setShowForm(false);
              load();
            }}
          />
        </div>
      )}

      {error && <p className="mb-4 rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : quotes.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">No quotes yet.</p>
        ) : (
          quotes.map((q) => (
            <Link
              key={q.id}
              href={`/office/quotes/${q.id}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 transition hover:bg-border/10"
            >
              <div>
                <p className="font-medium text-foreground">{q.customer.name}</p>
                <p className="text-sm text-muted">{new Date(q.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {centsToDollarsString(sumLineItemsCents(q.lineItems))}
                </span>
                <StatusBadge status={q.status} />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function NewQuoteForm({ onCreated }: { onCreated: () => void }) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPriceCents: 0 }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ customers: CustomerOption[] }>("/api/customers?pageSize=100").then((d) => setCustomers(d.customers));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/quotes", {
        method: "POST",
        body: JSON.stringify({ customerId, notes: notes || undefined, lineItems }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create quote.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}
      <select
        required
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      >
        <option value="">Select customer…</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <LineItemsEditor items={lineItems} onChange={setLineItems} />

      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Quote"}
      </button>
    </form>
  );
}
