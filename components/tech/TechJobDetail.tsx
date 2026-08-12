"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";

interface JobFull {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scheduledAt: string | null;
  property: {
    label: string;
    addressLine: string;
    city: string;
    accessNotes: string | null;
    customer: { name: string; phone: string | null };
  };
  photos: { id: string; url: string; caption: string | null }[];
}

export function TechJobDetail({ id }: { id: string }) {
  const [job, setJob] = useState<JobFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, [load]);

  async function setStatus(status: "IN_PROGRESS" | "COMPLETED") {
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ job: JobFull }>(`/api/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setJob(data.job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update this job.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/uploads", { method: "POST", body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed.");

      await apiFetch(`/api/jobs/${id}/photos`, {
        method: "POST",
        body: JSON.stringify({ url: uploadData.url }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that photo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (error && !job) return <p className="rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>;
  if (!job) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/tech" className="text-sm text-muted hover:text-foreground">
          ← My Jobs
        </Link>
        <div className="mt-2 flex items-center justify-between gap-2">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
            {job.title}
          </h1>
          <StatusBadge status={job.status} />
        </div>
        <p className="mt-1 text-sm text-muted">{job.property.customer.name}</p>
        <p className="text-sm text-muted">
          {job.property.label} — {job.property.addressLine}, {job.property.city}
        </p>
        {job.property.customer.phone && (
          <a href={`tel:${job.property.customer.phone}`} className="text-sm text-accent hover:underline">
            Call {job.property.customer.phone}
          </a>
        )}
        {job.property.accessNotes && (
          <p className="mt-2 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">
            Access notes: {job.property.accessNotes}
          </p>
        )}
        {job.description && <p className="mt-2 text-sm text-muted">{job.description}</p>}
        <p className="mt-1 text-xs text-muted">
          {job.scheduledAt ? new Date(job.scheduledAt).toLocaleString() : "Not scheduled"}
        </p>
      </div>

      {error && <p className="rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>}

      {job.status !== "COMPLETED" && job.status !== "CANCELLED" && (
        <div className="flex gap-3">
          {job.status !== "IN_PROGRESS" && (
            <button
              onClick={() => setStatus("IN_PROGRESS")}
              disabled={saving}
              className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-border/40 disabled:opacity-60"
            >
              Start Job
            </button>
          )}
          <button
            onClick={() => setStatus("COMPLETED")}
            disabled={saving}
            className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            Mark Complete
          </button>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            Photos {job.photos.length > 0 && `(${job.photos.length})`}
          </p>
          <label className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-border/40">
            {uploading ? "Uploading…" : "+ Add Photo"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
        {job.photos.length === 0 ? (
          <p className="text-sm text-muted">No photos yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
    </div>
  );
}
