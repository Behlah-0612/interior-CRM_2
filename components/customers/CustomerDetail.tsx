"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";

interface Property {
  id: string;
  label: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string | null;
  accessNotes: string | null;
}

interface CustomerFull {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  properties: Property[];
  quotes: { id: string; status: string; createdAt: string }[];
  invoices: { id: string; status: string; createdAt: string }[];
  soldBy: { id: string; name: string } | null;
}

interface SalespersonOption {
  id: string;
  name: string;
}

export function CustomerDetail({ id }: { id: string }) {
  const [customer, setCustomer] = useState<CustomerFull | null>(null);
  const [salespeople, setSalespeople] = useState<SalespersonOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPropertyForm, setShowPropertyForm] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    try {
      const data = await apiFetch<{ customer: CustomerFull }>(`/api/customers/${id}`);
      setCustomer(data.customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this customer.");
    }
  }, [id]);

  useEffect(() => {
    load();
    apiFetch<{ salespeople: SalespersonOption[] }>("/api/salespeople").then((d) => setSalespeople(d.salespeople));
  }, [load]);

  async function saveSalesperson(soldById: string) {
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ customer: CustomerFull }>(`/api/customers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ soldById: soldById || null }),
      });
      setCustomer(data.customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the salesperson.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !customer) return <p className="rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>;
  if (!customer) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link href="/office/customers" className="text-sm text-muted hover:text-foreground">
          ← Customers
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
          {customer.name}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {[customer.email, customer.phone].filter(Boolean).join(" · ") || "No contact info yet"}
        </p>
      </div>

      {error && <p className="rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>}

      {salespeople.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Salesperson who sold this account
          </label>
          <select
            value={customer.soldBy?.id ?? ""}
            disabled={saving}
            onChange={(e) => saveSalesperson(e.target.value)}
            className="w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            <option value="">No salesperson</option>
            {salespeople.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
            Properties
          </h2>
          <button
            onClick={() => setShowPropertyForm((s) => !s)}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-border/40"
          >
            {showPropertyForm ? "Cancel" : "+ Add Property"}
          </button>
        </div>

        {showPropertyForm && (
          <div className="mb-4 rounded-lg border border-border bg-surface p-4">
            <NewPropertyForm
              customerId={id}
              onCreated={() => {
                setShowPropertyForm(false);
                load();
              }}
            />
          </div>
        )}

        {customer.properties.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
            No properties yet.
          </p>
        ) : (
          <div className="space-y-2">
            {customer.properties.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-surface p-4">
                <p className="font-medium text-foreground">{p.label}</p>
                <p className="text-sm text-muted">
                  {p.addressLine}, {p.city}, {p.province} {p.postalCode || ""}
                </p>
                {p.accessNotes && <p className="mt-1 text-xs text-muted">Access: {p.accessNotes}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
            Recent Quotes
          </h2>
          {customer.quotes.length === 0 ? (
            <p className="text-sm text-muted">No quotes yet.</p>
          ) : (
            <ul className="space-y-2">
              {customer.quotes.map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/office/quotes/${q.id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-sm hover:bg-border/10"
                  >
                    <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                    <StatusBadge status={q.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
            Recent Invoices
          </h2>
          {customer.invoices.length === 0 ? (
            <p className="text-sm text-muted">No invoices yet.</p>
          ) : (
            <ul className="space-y-2">
              {customer.invoices.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/office/invoices/${inv.id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-sm hover:bg-border/10"
                  >
                    <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                    <StatusBadge status={inv.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function NewPropertyForm({ customerId, onCreated }: { customerId: string; onCreated: () => void }) {
  const [label, setLabel] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/properties", {
        method: "POST",
        body: JSON.stringify({
          customerId,
          label,
          addressLine,
          city,
          province: "BC",
          postalCode: postalCode || undefined,
          accessNotes: accessNotes || undefined,
        }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add property.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          placeholder="Label (e.g. Main House)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <input
          required
          placeholder="Street address"
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <input
          required
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <input
          placeholder="Postal code (optional)"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>
      <textarea
        placeholder="Access notes — gate code, pets, parking (optional)"
        value={accessNotes}
        onChange={(e) => setAccessNotes(e.target.value)}
        rows={2}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Property"}
      </button>
    </form>
  );
}
