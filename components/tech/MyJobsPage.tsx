"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";

interface JobListItem {
  id: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  property: {
    label: string;
    addressLine: string;
    city: string;
    customer: { name: string; phone: string | null };
  };
}

export function MyJobsPage() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ jobs: JobListItem[] }>("/api/jobs")
      .then((d) => setJobs(d.jobs))
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your jobs."))
      .finally(() => setLoading(false));
  }, []);

  const active = jobs.filter((j) => j.status !== "COMPLETED" && j.status !== "CANCELLED");
  const done = jobs.filter((j) => j.status === "COMPLETED" || j.status === "CANCELLED");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
        My Jobs
      </h1>

      {error && <p className="mb-4 rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : jobs.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
          You don&apos;t have any jobs assigned right now.
        </p>
      ) : (
        <div className="space-y-6">
          <JobGroup title="Up next" jobs={active} />
          {done.length > 0 && <JobGroup title="Completed" jobs={done} />}
        </div>
      )}
    </div>
  );
}

function JobGroup({ title, jobs }: { title: string; jobs: JobListItem[] }) {
  if (jobs.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">{title}</h2>
      <div className="space-y-2">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/tech/jobs/${job.id}`}
            className="block rounded-lg border border-border bg-surface p-4 transition hover:bg-border/10"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-foreground">{job.title}</p>
              <StatusBadge status={job.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {job.property.customer.name} · {job.property.addressLine}, {job.property.city}
            </p>
            <p className="text-xs text-muted">
              {job.scheduledAt ? new Date(job.scheduledAt).toLocaleString() : "Not scheduled"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
