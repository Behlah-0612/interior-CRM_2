"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { centsToDollarsString } from "@/lib/money";
import { bpsToPercentString, percentStringToBps, type CommissionTierLike } from "@/lib/commission";

interface SalespersonSummary {
  id: string;
  name: string;
  email: string;
  totalRevenueCents: number;
  jobCount: number;
  manualRateBps: number | null;
  effectiveRateBps: number;
  estimatedCommissionCents: number;
}

interface Tier extends CommissionTierLike {
  id: string;
  name: string;
  active: boolean;
}

export function SalesCommissionsPage() {
  const [summaries, setSummaries] = useState<SalespersonSummary[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, tierData] = await Promise.all([
        apiFetch<{ summaries: SalespersonSummary[] }>("/api/sales/team-summary"),
        apiFetch<{ tiers: Tier[] }>("/api/commission-tiers"),
      ]);
      setSummaries(summaryData.summaries);
      setTiers(tierData.tiers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load commissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveManualRate(userId: string, percentInput: string) {
    const bps = percentInput.trim() === "" ? null : percentStringToBps(percentInput);
    if (percentInput.trim() !== "" && bps === null) {
      setError("Enter a valid percentage.");
      return;
    }
    setError(null);
    try {
      await apiFetch(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ commissionRateBps: bps }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that rate.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
          Commissions
        </h1>
        <p className="mt-1 text-sm text-muted">
          Each salesperson has a manual base rate. If an active tier&apos;s revenue threshold is reached, that
          tier&apos;s rate is used instead — the highest threshold they qualify for wins.
        </p>
      </div>

      {error && <p className="rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>}

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
          Salespeople
        </h2>
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {loading ? (
            <p className="p-6 text-sm text-muted">Loading…</p>
          ) : summaries.length === 0 ? (
            <p className="p-6 text-sm text-muted">
              No salespeople yet — create one from the Staff page and set their role to Salesperson.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-border/20 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Jobs</th>
                  <th className="px-4 py-2.5 font-medium">Revenue Sold</th>
                  <th className="px-4 py-2.5 font-medium">Manual Rate</th>
                  <th className="px-4 py-2.5 font-medium">Effective Rate</th>
                  <th className="px-4 py-2.5 font-medium">Est. Commission</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                    <td className="px-4 py-3 text-muted">{s.jobCount}</td>
                    <td className="px-4 py-3 text-muted">{centsToDollarsString(s.totalRevenueCents)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          defaultValue={s.manualRateBps != null ? (s.manualRateBps / 100).toString() : ""}
                          placeholder="0"
                          onBlur={(e) => saveManualRate(s.id, e.target.value)}
                          className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                        />
                        <span className="text-muted">%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          s.effectiveRateBps !== (s.manualRateBps ?? 0)
                            ? "font-medium text-accent"
                            : "text-foreground"
                        }
                      >
                        {bpsToPercentString(s.effectiveRateBps)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {centsToDollarsString(s.estimatedCommissionCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
          Commission Tiers
        </h2>
        <p className="mb-3 text-sm text-muted">
          Automatic rate breakpoints, applied to all-time revenue sold per salesperson.
        </p>
        <TierList tiers={tiers} onChanged={load} />
      </section>
    </div>
  );
}

function TierList({ tiers, onChanged }: { tiers: Tier[]; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive(tier: Tier) {
    setError(null);
    try {
      await apiFetch(`/api/commission-tiers/${tier.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !tier.active }),
      });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that tier.");
    }
  }

  async function remove(tier: Tier) {
    setError(null);
    try {
      await apiFetch(`/api/commission-tiers/${tier.id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that tier.");
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

      {tiers.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          No tiers yet — every salesperson uses their manual rate.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-border/20 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Tier</th>
                <th className="px-4 py-2.5 font-medium">Kicks in at</th>
                <th className="px-4 py-2.5 font-medium">Rate</th>
                <th className="px-4 py-2.5 font-medium">Active</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {tiers
                .slice()
                .sort((a, b) => a.minRevenueCents - b.minRevenueCents)
                .map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{t.name}</td>
                    <td className="px-4 py-3 text-muted">{centsToDollarsString(t.minRevenueCents)}+</td>
                    <td className="px-4 py-3 text-muted">{bpsToPercentString(t.rateBps)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(t)}
                        className={t.active ? "text-success" : "text-muted"}
                      >
                        {t.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(t)} className="text-sm text-danger hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={() => setShowForm((s) => !s)}
        className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-border/40"
      >
        {showForm ? "Cancel" : "+ Add Tier"}
      </button>

      {showForm && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <NewTierForm
            onCreated={() => {
              setShowForm(false);
              onChanged();
            }}
          />
        </div>
      )}
    </div>
  );
}

function NewTierForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [minRevenue, setMinRevenue] = useState("");
  const [rate, setRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rateBps = percentStringToBps(rate);
    const minRevenueCents = Math.round((parseFloat(minRevenue) || 0) * 100);
    if (rateBps === null) {
      setError("Enter a valid rate percentage.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/commission-tiers", {
        method: "POST",
        body: JSON.stringify({ name, minRevenueCents, rateBps }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create that tier.");
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
          placeholder="Tier name (e.g. Gold)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <input
          required
          type="number"
          min="0"
          step="0.01"
          placeholder="Revenue threshold ($)"
          value={minRevenue}
          onChange={(e) => setMinRevenue(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <input
          required
          type="number"
          min="0"
          max="100"
          step="0.01"
          placeholder="Rate (%)"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Tier"}
      </button>
    </form>
  );
}
