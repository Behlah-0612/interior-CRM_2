"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { centsToDollarsString } from "@/lib/money";

interface Summary {
  jobsToday: number;
  jobsScheduled: number;
  jobsInProgress: number;
  unpaidInvoiceCount: number;
  unpaidTotalCents: number;
  totalCustomers: number;
  activeStaff: number;
  pendingQuotes: number;
}

export function OverviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Summary>("/api/reports/summary")
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load the overview."));
  }, []);

  if (error) return <p className="rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>;
  if (!summary) return <p className="text-sm text-muted">Loading…</p>;

  const cards = [
    { label: "Jobs today", value: summary.jobsToday },
    { label: "Scheduled jobs", value: summary.jobsScheduled },
    { label: "Jobs in progress", value: summary.jobsInProgress },
    { label: "Pending quotes", value: summary.pendingQuotes },
    { label: "Unpaid invoices", value: summary.unpaidInvoiceCount },
    { label: "Unpaid total", value: centsToDollarsString(summary.unpaidTotalCents) },
    { label: "Customers", value: summary.totalCustomers },
    { label: "Active staff", value: summary.activeStaff },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
        Overview
      </h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
