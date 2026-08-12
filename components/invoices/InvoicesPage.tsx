"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { centsToDollarsString, sumLineItemsCents } from "@/lib/money";
import { LineItemsEditor, type LineItem } from "@/components/LineItemsEditor";

interface InvoiceListItem {
  id: string;
  status: string;
  createdAt: string;
  dueDate: string | null;
  customer: { name: string };
  lineItems: { quantity: number; unitPriceCents: number }[];
}

interface CustomerOption {
  id: string;
  name: string;
}

export function InvoicesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <InvoicesPageInner />
    </Suspense>
  );
}

function InvoicesPageInner() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(Boolean(searchParams.get("jobId") || searchParams.get("customerId")));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ invoices: InvoiceListItem[] }>("/api/invoices");
      setInvoices(data.invoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load invoices.");
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
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">Invoices</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          {showForm ? "Cancel" : "+ New Invoice"}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-4">
          <NewInvoiceForm
            defaultCustomerId={searchParams.get("customerId") || ""}
            defaultJobId={searchParams.get("jobId") || ""}
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
        ) : invoices.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">No invoices yet.</p>
        ) : (
          invoices.map((inv) => (
            <Link
              key={inv.id}
              href={`/office/invoices/${inv.id}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 transition hover:bg-border/10"
            >
              <div>
                <p className="font-medium text-foreground">{inv.customer.name}</p>
                <p className="text-sm text-muted">
                  {new Date(inv.createdAt).toLocaleDateString()}
                  {inv.dueDate ? ` · Due ${new Date(inv.dueDate).toLocaleDateString()}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {centsToDollarsString(sumLineItemsCents(inv.lineItems))}
                </span>
                <StatusBadge status={inv.status} />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function NewInvoiceForm({
  defaultCustomerId,
  defaultJobId,
  onCreated,
}: {
  defaultCustomerId: string;
  defaultJobId: string;
  onCreated: () => void;
}) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [dueDate, setDueDate] = useState("");
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
      await apiFetch("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          customerId,
          jobId: defaultJobId || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          notes: notes || undefined,
          lineItems,
        }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create invoice.");
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

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <input
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Invoice"}
      </button>
    </form>
  );
}
