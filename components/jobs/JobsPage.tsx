"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { centsToDollarsString } from "@/lib/money";

interface JobListItem {
  id: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  priceCents: number | null;
  property: {
    label: string;
    addressLine: string;
    city: string;
    customer: { name: string; soldBy: { id: string; name: string } | null };
  };
  assignments: { technician: { id: string; name: string } }[];
}

interface SalespersonOption {
  id: string;
  name: string;
}

const STATUS_OPTIONS = ["UNSCHEDULED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export function JobsPage() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [salespeople, setSalespeople] = useState<SalespersonOption[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [salespersonFilter, setSalespersonFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async (status: string, salespersonId: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (salespersonId) params.set("salespersonId", salespersonId);
      const data = await apiFetch<{ jobs: JobListItem[] }>(`/api/jobs?${params}`);
      setJobs(data.jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load jobs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    apiFetch<{ salespeople: SalespersonOption[] }>("/api/salespeople").then((d) => setSalespeople(d.salespeople));
  }, []);

  useEffect(() => {
    load(statusFilter, salespersonFilter);
  }, [statusFilter, salespersonFilter, load]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
          Jobs
        </h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          {showForm ? "Cancel" : "+ New Job"}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-4">
          <NewJobForm
            onCreated={() => {
              setShowForm(false);
              load(statusFilter, salespersonFilter);
            }}
          />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-2 overflow-x-auto">
          <FilterPill label="All" active={statusFilter === ""} onClick={() => setStatusFilter("")} />
          {STATUS_OPTIONS.map((s) => (
            <FilterPill key={s} label={s.replace("_", " ")} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
          ))}
        </div>
        {salespeople.length > 0 && (
          <select
            value={salespersonFilter}
            onChange={(e) => setSalespersonFilter(e.target.value)}
            className="ml-auto rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
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

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : jobs.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">No jobs found.</p>
        ) : (
          jobs.map((job) => (
            <Link
              key={job.id}
              href={`/office/jobs/${job.id}`}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition hover:bg-border/10 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">{job.title}</p>
                <p className="text-sm text-muted">
                  {job.property.customer.name} · {job.property.addressLine}, {job.property.city}
                </p>
                <p className="text-xs text-muted">
                  {job.assignments.length > 0
                    ? job.assignments.map((a) => a.technician.name).join(", ")
                    : "Unassigned"}
                  {job.property.customer.soldBy && ` · Sold by ${job.property.customer.soldBy.name}`}
                </p>
              </div>
              <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                <StatusBadge status={job.status} />
                <p className="text-sm text-muted">
                  {job.scheduledAt ? new Date(job.scheduledAt).toLocaleString() : "Not scheduled"}
                </p>
                {job.priceCents != null && (
                  <p className="text-sm font-medium text-foreground">{centsToDollarsString(job.priceCents)}</p>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
        active ? "bg-accent text-accent-foreground" : "border border-border text-muted hover:bg-border/40"
      }`}
    >
      {label.toLowerCase()}
    </button>
  );
}

interface CustomerOption {
  id: string;
  name: string;
}
interface PropertyOption {
  id: string;
  label: string;
  addressLine: string;
}
interface TechnicianOption {
  id: string;
  name: string;
}

function NewJobForm({ onCreated }: { onCreated: () => void }) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [price, setPrice] = useState("");
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ customers: CustomerOption[] }>("/api/customers?pageSize=100").then((d) => setCustomers(d.customers));
    apiFetch<{ technicians: TechnicianOption[] }>("/api/technicians").then((d) => setTechnicians(d.technicians));
  }, []);

  useEffect(() => {
    setPropertyId("");
    if (!customerId) {
      setProperties([]);
      return;
    }
    apiFetch<{ properties: PropertyOption[] }>(`/api/properties?customerId=${customerId}`).then((d) =>
      setProperties(d.properties)
    );
  }, [customerId]);

  function toggleTech(id: string) {
    setSelectedTechIds((cur) => (cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/jobs", {
        method: "POST",
        body: JSON.stringify({
          propertyId,
          title,
          description: description || undefined,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          priceCents: price ? Math.round(parseFloat(price) * 100) : undefined,
          technicianIds: selectedTechIds,
        }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create job.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <select
          required
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        >
          <option value="">Select customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          required
          disabled={!customerId}
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50"
        >
          <option value="">Select property…</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} — {p.addressLine}
            </option>
          ))}
        </select>
      </div>

      <input
        required
        placeholder="Job title (e.g. Exterior window clean)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />

      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Price (optional)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      {technicians.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Assign crew</p>
          <div className="flex flex-wrap gap-2">
            {technicians.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => toggleTech(t.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  selectedTechIds.includes(t.id)
                    ? "bg-accent text-accent-foreground"
                    : "border border-border text-muted hover:bg-border/40"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Job"}
      </button>
    </form>
  );
}
