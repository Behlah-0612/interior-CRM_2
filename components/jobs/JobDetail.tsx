"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { centsToDollarsString } from "@/lib/money";

interface JobFull {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scheduledAt: string | null;
  priceCents: number | null;
  property: {
    id: string;
    label: string;
    addressLine: string;
    city: string;
    accessNotes: string | null;
    customer: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      soldBy: { id: string; name: string } | null;
    };
  };
  assignments: { technician: { id: string; name: string } }[];
  photos: { id: string; url: string; caption: string | null; createdAt: string }[];
}

interface TechnicianOption {
  id: string;
  name: string;
}

const STATUS_OPTIONS = ["UNSCHEDULED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export function JobDetail({ id }: { id: string }) {
  const [job, setJob] = useState<JobFull | null>(null);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ job: JobFull }>(`/api/jobs/${id}`);
      setJob(data.job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this job.");
    }
  }, [id]);

  useEffect(() => {
    load();
    apiFetch<{ technicians: TechnicianOption[] }>("/api/technicians").then((d) => setTechnicians(d.technicians));
  }, [load]);

  async function updateJob(patch: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ job: JobFull }>(`/api/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setJob(data.job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  function toggleTech(techId: string) {
    if (!job) return;
    const current = job.assignments.map((a) => a.technician.id);
    const next = current.includes(techId) ? current.filter((t) => t !== techId) : [...current, techId];
    updateJob({ technicianIds: next });
  }

  if (error && !job) return <p className="rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>;
  if (!job) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/office/jobs" className="text-sm text-muted hover:text-foreground">
          ← Jobs
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
            {job.title}
          </h1>
          <StatusBadge status={job.status} />
        </div>
        <p className="mt-1 text-sm text-muted">
          <Link href={`/office/customers/${job.property.customer.id}`} className="text-accent hover:underline">
            {job.property.customer.name}
          </Link>{" "}
          · {job.property.label} — {job.property.addressLine}, {job.property.city}
        </p>
        {job.property.accessNotes && (
          <p className="mt-1 text-xs text-muted">Access: {job.property.accessNotes}</p>
        )}
        {job.property.customer.soldBy && (
          <p className="mt-1 text-xs text-muted">Sold by {job.property.customer.soldBy.name}</p>
        )}
      </div>

      {error && <p className="rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
            <select
              value={job.status}
              disabled={saving}
              onChange={(e) => updateJob({ status: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Scheduled</label>
            <input
              type="datetime-local"
              disabled={saving}
              defaultValue={job.scheduledAt ? toLocalInputValue(job.scheduledAt) : ""}
              onBlur={(e) =>
                updateJob({ scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null })
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={saving}
              defaultValue={job.priceCents != null ? (job.priceCents / 100).toFixed(2) : ""}
              onBlur={(e) =>
                updateJob({ priceCents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {job.description && <p className="mt-4 text-sm text-muted">{job.description}</p>}
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="mb-2 text-sm font-medium text-foreground">Crew</p>
        <div className="flex flex-wrap gap-2">
          {technicians.length === 0 && <p className="text-sm text-muted">No technician accounts yet.</p>}
          {technicians.map((t) => {
            const assigned = job.assignments.some((a) => a.technician.id === t.id);
            return (
              <button
                key={t.id}
                disabled={saving}
                onClick={() => toggleTech(t.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  assigned ? "bg-accent text-accent-foreground" : "border border-border text-muted hover:bg-border/40"
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      {job.status === "COMPLETED" && (
        <Link
          href={`/office/invoices?jobId=${job.id}&customerId=${job.property.customer.id}`}
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          Create Invoice from this Job
        </Link>
      )}

      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="mb-3 text-sm font-medium text-foreground">
          Job Photos {job.photos.length > 0 && `(${job.photos.length})`}
        </p>
        {job.photos.length === 0 ? (
          <p className="text-sm text-muted">No photos uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {job.photos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo.id}
                src={photo.url}
                alt={photo.caption || "Job photo"}
                className="aspect-square w-full rounded-md border border-border object-cover"
              />
            ))}
          </div>
        )}
      </div>

      {job.priceCents != null && (
        <p className="text-sm text-muted">Job price: {centsToDollarsString(job.priceCents)}</p>
      )}
    </div>
  );
}

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}
