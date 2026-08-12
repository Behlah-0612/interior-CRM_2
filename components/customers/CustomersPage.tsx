"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  _count: { properties: number };
  soldBy: { id: string; name: string } | null;
}

interface SalespersonOption {
  id: string;
  name: string;
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salespeople, setSalespeople] = useState<SalespersonOption[]>([]);
  const [q, setQ] = useState("");
  const [salespersonFilter, setSalespersonFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async (query: string, salespersonId: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (salespersonId) params.set("salespersonId", salespersonId);
      const data = await apiFetch<{ customers: Customer[] }>(`/api/customers?${params}`);
      setCustomers(data.customers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load customers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    apiFetch<{ salespeople: SalespersonOption[] }>("/api/salespeople").then((d) => setSalespeople(d.salespeople));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => load(q, salespersonFilter), 250);
    return () => clearTimeout(timeout);
  }, [q, salespersonFilter, load]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
          Customers
        </h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          {showForm ? "Cancel" : "+ New Customer"}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-4">
          <NewCustomerForm
            salespeople={salespeople}
            onCreated={() => {
              setShowForm(false);
              load(q, salespersonFilter);
            }}
          />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="Search by name, email, or phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        {salespeople.length > 0 && (
          <select
            value={salespersonFilter}
            onChange={(e) => setSalespersonFilter(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            <option value="">All salespeople</option>
            {salespeople.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="mb-4 rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {loading ? (
          <p className="p-6 text-sm text-muted">Loading…</p>
        ) : customers.length === 0 ? (
          <p className="p-6 text-sm text-muted">No customers yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-border/20 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Contact</th>
                <th className="px-4 py-2.5 font-medium">Properties</th>
                <th className="px-4 py-2.5 font-medium">Salesperson</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-border/10">
                  <td className="px-4 py-3">
                    <Link href={`/office/customers/${c.id}`} className="font-medium text-accent hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.email || c.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{c._count.properties}</td>
                  <td className="px-4 py-3 text-muted">{c.soldBy?.name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function NewCustomerForm({
  salespeople,
  onCreated,
}: {
  salespeople: SalespersonOption[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [soldById, setSoldById] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name,
          email: email || undefined,
          phone: phone || undefined,
          soldById: soldById || undefined,
        }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create customer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          required
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <input
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>
      {salespeople.length > 0 && (
        <select
          value={soldById}
          onChange={(e) => setSoldById(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        >
          <option value="">No salesperson (optional)</option>
          {salespeople.map((s) => (
            <option key={s.id} value={s.id}>
              Sold by {s.name}
            </option>
          ))}
        </select>
      )}
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Customer"}
      </button>
    </form>
  );
}
