"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { centsToDollarsString } from "@/lib/money";
import { bpsToPercentString, nextTier, type CommissionTierLike } from "@/lib/commission";

interface Summary {
  id: string;
  name: string;
  totalRevenueCents: number;
  jobCount: number;
  manualRateBps: number | null;
  effectiveRateBps: number;
  estimatedCommissionCents: number;
}

interface Tier extends CommissionTierLike {
  id: string;
  name: string;
}

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
    customer: { name: string };
  };
}

export function MySalesPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ summary: Summary | null; tiers: Tier[] }>("/api/sales/summary"),
      apiFetch<{ jobs: JobListItem[] }>("/api/jobs"),
    ])
      .then(([summaryData, jobsData]) => {
        setSummary(summaryData.summary);
        setTiers(summaryData.tiers);
        setJobs(jobsData.jobs);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your sales."));
  }, []);

  if (error) return <p className="rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>;
  if (!summary) return <p className="text-sm text-muted">Loading…</p>;

  const upcoming = nextTier(summary.totalRevenueCents, tiers);
  const progressPct = upcoming
    ? Math.min(100, Math.round((summary.totalRevenueCents / upcoming.minRevenueCents) * 100))
    : 100;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
        My Sales
      </h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Revenue sold" value={centsToDollarsString(summary.totalRevenueCents)} />
        <StatCard label="Accounts' jobs" value={summary.jobCount} />
        <StatCard label="Commission rate" value={bpsToPercentString(summary.effectiveRateBps)} />
        <StatCard label="Est. commission" value={centsToDollarsString(summary.estimatedCommissionCents)} />
      </div>

      {upcoming && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-foreground">
              Next tier: <span className="font-medium">{upcoming.name}</span> at{" "}
              {bpsToPercentString(upcoming.rateBps)}
            </span>
            <span className="text-muted">
              {centsToDollarsString(summary.totalRevenueCents)} / {centsToDollarsString(upcoming.minRevenueCents)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-accent" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
          My Jobs
        </h2>
        {jobs.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
            No jobs under your accounts yet.
          </p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{job.title}</p>
                  <StatusBadge status={job.status} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {job.property.customer.name} · {job.property.addressLine}, {job.property.city}
                </p>
                <div className="mt-1 flex items-center justify-between text-xs text-muted">
                  <span>{job.scheduledAt ? new Date(job.scheduledAt).toLocaleString() : "Not scheduled"}</span>
                  {job.priceCents != null && <span>{centsToDollarsString(job.priceCents)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-muted">
        Commission is estimated by applying your current rate to total revenue sold — it isn&apos;t a locked-in
        historical record. Questions about your rate? Ask an admin.
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
