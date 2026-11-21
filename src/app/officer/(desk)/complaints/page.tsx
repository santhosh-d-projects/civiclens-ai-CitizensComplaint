// Officer complaints queue — search, status/severity/category/ward
// filters, sorting, pagination. Data comes from
// GET /api/department/complaints (department-scoped server-side).
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, EmptyState, Field, GlassCard, PageHeader, SeverityBadge, StatusPill, inputClass } from "@/components/ui";
import { slaLabel, formatDateTime } from "@/app/officer/format";

type Row = {
  id: string;
  ticket_no: string;
  title: string;
  severity: string;
  status: string;
  category_id: number | null;
  ward_id: number | null;
  sla_due_at: string | null;
  created_at: string;
};

const STATUSES = ["", "submitted", "received", "in_progress", "resolved", "closed", "reopened"];
const SEVERITIES = ["", "low", "medium", "high", "critical"];

export default function OfficerQueue() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [wards, setWards] = useState<{ id: number; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: number; slug: string; name: string }[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [wardId, setWardId] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sort,
    });
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (severity) params.set("severity", severity);
    if (categoryId) params.set("category_id", categoryId);
    if (wardId) params.set("ward_id", wardId);
    const res = await fetch(`/api/department/complaints?${params}`);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(j?.error?.message ?? "Could not load the queue.");
      setRows([]);
      setTotal(0);
    } else {
      const j = (await res.json()) as {
        complaints: Row[];
        total: number;
        wards: { id: number; name: string }[];
        categories: { id: number; slug: string; name: string }[];
      };
      setRows(j.complaints);
      setTotal(j.total);
      setWards(j.wards);
      setCategories(j.categories);
    }
    setLoading(false);
  }, [q, status, severity, categoryId, wardId, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const wardName = (id: number | null) => wards.find((w) => w.id === id)?.name ?? "";
  const catName = (id: number | null) => categories.find((c) => c.id === id)?.name ?? "";

  const resetFilters = () => {
    setQ("");
    setStatus("");
    setSeverity("");
    setCategoryId("");
    setWardId("");
    setSort("newest");
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Officer Desk"
        title="My Complaints"
        sub="Complaints citizens confirmed for your department, newest first."
      />

      <GlassCard className="mt-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Search">
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Ticket, title or keyword"
              className={inputClass}
              data-testid="queue-search"
            />
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className={inputClass}
              data-testid="queue-filter-status"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s === "" ? "All statuses" : s.replaceAll("_", " ")}</option>
              ))}
            </select>
          </Field>
          <Field label="Severity">
            <select
              value={severity}
              onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
              className={inputClass}
              data-testid="queue-filter-severity"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s === "" ? "All severities" : s}</option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
              className={inputClass}
              data-testid="queue-filter-category"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Ward">
            <select
              value={wardId}
              onChange={(e) => { setWardId(e.target.value); setPage(1); }}
              className={inputClass}
              data-testid="queue-filter-ward"
            >
              <option value="">All wards</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Sort">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className={inputClass}
              data-testid="queue-sort"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="severity">Highest severity</option>
              <option value="sla">SLA due soonest</option>
            </select>
          </Field>
          <div className="flex items-end">
            <Button variant="secondary" onClick={resetFilters} data-testid="queue-reset-filters">
              Clear filters
            </Button>
          </div>
        </div>
      </GlassCard>

      {error && (
        <p className="mt-4 rounded-xl border border-critical/30 bg-critical-bg px-4 py-3 text-sm font-medium text-critical">
          {error}
        </p>
      )}

      <div className="mt-5">
        {loading ? (
          <div className="space-y-2" data-testid="queue-loading">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass h-16 animate-pulse rounded-3xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No complaints match these filters"
            body="Try a different search or clear the filters."
            action={
              <Button variant="secondary" onClick={resetFilters} data-testid="queue-empty-clear">
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <p className="tnum mb-2 text-xs font-medium text-slate-muted" data-testid="queue-count">
              {total} complaint{total === 1 ? "" : "s"} · page {page} of {totalPages}
            </p>
            <GlassCard className="overflow-hidden p-0">
              <ul className="divide-y divide-line/60">
                {rows.map((c) => {
                  const sla = slaLabel(c.sla_due_at);
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/officer/complaints/${c.id}`}
                        data-testid={`queue-complaint-${c.ticket_no}`}
                        className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/70 sm:px-5"
                      >
                        <span className="tnum text-sm font-semibold text-navy-ink">{c.ticket_no}</span>
                        <SeverityBadge severity={c.severity} />
                        <StatusPill status={c.status} />
                        <span className="min-w-0 flex-1 truncate text-sm text-navy-ink">{c.title}</span>
                        <span className="text-xs text-slate-muted">{catName(c.category_id)}</span>
                        <span className="text-xs text-slate-muted">{wardName(c.ward_id)}</span>
                        <span
                          className={`text-xs font-semibold ${sla.tone === "bad" ? "text-critical" : sla.tone === "warn" ? "text-high" : "text-slate-muted"}`}
                        >
                          {sla.text}
                        </span>
                        <span className="tnum text-xs text-slate-muted">{formatDateTime(c.created_at)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                data-testid="queue-prev-page"
              >
                ← Previous
              </Button>
              <span className="tnum text-sm text-slate-muted">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                data-testid="queue-next-page"
              >
                Next →
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
