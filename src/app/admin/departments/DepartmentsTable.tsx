// Departments table (client): tabs, search, pagination, row → drawer.
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, StatusPill, EmptyState, Chip, GlassCard, inputClass } from "@/components/ui";
import DepartmentReviewDrawer from "./DepartmentReviewDrawer";

type DeptRow = {
  id: string;
  name: string;
  official_email: string;
  official_phone: string | null;
  applicant_name: string | null;
  status: string;
  source: string;
  created_at: string;
  wards: string[];
  officer: { name: string; email: string } | null;
};

type Tab = "pending" | "approved" | "rejected" | "all";

export default function DepartmentsTable() {
  const [tab, setTab] = useState<Tab>("pending");
  const [chip, setChip] = useState<"all" | "active" | "suspended">("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<DeptRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      tab,
      q,
      page: String(page),
      per_page: "10",
    });
    const res = await fetch(`/api/admin/departments?${params}`);
    const body = (await res.json()) as {
      departments?: DeptRow[];
      total?: number;
      error?: { message: string };
    };
    setLoading(false);
    if (!res.ok) {
      setError(body.error?.message ?? "Could not load departments.");
      return;
    }
    let list = body.departments ?? [];
    if (tab === "approved" && chip !== "all") {
      list = list.filter((d) => d.status === chip);
    }
    setRows(list);
    setTotal(body.total ?? 0);
  }, [tab, chip, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "pending", label: "Pending" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
    { id: "all", label: "All" },
  ];

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Department status">
        {tabs.map((t) => (
          <span key={t.id} role="tab" aria-selected={tab === t.id}>
            <Chip
              active={tab === t.id}
              onClick={() => {
                setTab(t.id);
                setPage(1);
              }}
              testId={`departments-tab-${t.id}`}
            >
              {t.label}
            </Chip>
          </span>
        ))}
        {tab === "approved" && (
          <span className="ml-2 flex gap-1">
            {(["all", "active", "suspended"] as const).map((c) => (
              <Chip
                key={c}
                active={chip === c}
                onClick={() => setChip(c)}
                testId={`departments-chip-${c}`}
              >
                {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
              </Chip>
            ))}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name, email or applicant…"
          className={`${inputClass} max-w-sm`}
          data-testid="departments-search"
          aria-label="Search departments"
        />
      </div>

      {error && (
        <p className="mt-4 rounded-2xl border border-critical/30 bg-critical-bg px-4 py-3 text-sm text-critical">
          {error}
        </p>
      )}

      <GlassCard className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-white/60 text-xs uppercase tracking-wide text-slate-muted">
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">Service area</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-muted">
                  Loading departments…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8">
                  <EmptyState
                    title="No departments match"
                    body="Try a different tab or search."
                  />
                </td>
              </tr>
            ) : (
              rows.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className="cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-indigo/[0.04]"
                  data-testid={`department-row-${d.id}`}
                >
                  <td className="px-4 py-3 font-semibold">{d.name}</td>
                  <td className="px-4 py-3">{d.applicant_name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-muted">
                    {d.wards.length > 0 ? d.wards.slice(0, 3).join(", ") + (d.wards.length > 3 ? ` +${d.wards.length - 3}` : "") : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-muted">{d.official_email}</td>
                  <td className="px-4 py-3 text-slate-muted">
                    {new Date(d.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-slate-muted">
                    {d.source === "applied" ? "Applied" : "Admin created"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={d.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </GlassCard>

      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="secondary"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          data-testid="departments-prev"
        >
          ← Previous
        </Button>
        <span className="text-sm text-slate-muted">
          Page {page} · {total} department{total === 1 ? "" : "s"}
        </span>
        <Button
          variant="secondary"
          disabled={rows.length < 10 || loading}
          onClick={() => setPage((p) => p + 1)}
          data-testid="departments-next"
        >
          Next →
        </Button>
      </div>

      <DepartmentReviewDrawer
        departmentId={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={load}
      />
    </div>
  );
}
