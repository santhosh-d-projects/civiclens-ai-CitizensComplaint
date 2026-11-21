// Admin complaints registry — READ-ONLY (master prompt §5).
// "Complaints are routed by citizen confirmation based on AI suggestions.
// Admin accounts monitor city-wide performance and do not manually route
// or dispatch individual complaints."
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  StatusPill,
  SeverityBadge,
  EmptyState,
  Drawer,
  inputClass,
} from "@/components/ui";

type Row = {
  id: string;
  ticket_no: string;
  title: string;
  severity: string;
  status: string;
  department_name: string;
  ward_name: string;
  category_name: string;
  sla_due_at: string | null;
  created_at: string;
};

type Detail = {
  complaint: Row & {
    description: string;
    address: string | null;
    ai_reason: string | null;
    ai_confidence: number | null;
    citizen_changed_suggestion: boolean;
    resolution_note: string | null;
    resolved_at: string | null;
  };
  events: { id: number; event: string; created_at: string; meta: Record<string, unknown> }[];
  aiLog: { provider: string; model: string; source: string; confidence: number | null } | null;
  transfers: { id: number; from_department_id: string; to_department_id: string; reason: string; created_at: string }[];
};

export default function AdminComplaintsTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [q, setQ] = useState("");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page: String(page),
      per_page: "20",
    });
    if (status) params.set("status", status);
    if (severity) params.set("severity", severity);
    if (departmentId) params.set("department_id", departmentId);
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/admin/complaints?${params}`);
    const body = (await res.json()) as {
      complaints?: Row[];
      total?: number;
      error?: { message: string };
    };
    setLoading(false);
    if (!res.ok) {
      setError(body.error?.message ?? "Could not load complaints.");
      return;
    }
    setRows(body.complaints ?? []);
    setTotal(body.total ?? 0);
  }, [page, status, severity, departmentId, q]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/admin/departments?tab=all&per_page=50")
      .then((r) => r.json())
      .then((b: { departments?: { id: string; name: string }[] }) =>
        setDepartments(b.departments ?? []),
      )
      .catch(() => undefined);
  }, []);

  async function openDetail(id: string) {
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    const res = await fetch(`/api/admin/complaints/${id}`);
    const body = (await res.json()) as Detail & { error?: { message: string } };
    setDetailLoading(false);
    if (res.ok) setDetail(body);
  }

  return (
    <div className="mt-6">
      <div className="rounded border border-teal/40 bg-teal-soft px-4 py-3 text-sm">
        <strong>Admin monitoring mode.</strong> Complaints are routed by
        citizen confirmation based on AI suggestions. Admin accounts monitor
        city-wide performance and do not manually route or dispatch individual
        complaints.
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search ticket or title…"
          className={`${inputClass} max-w-xs`}
          data-testid="admin-complaints-search"
          aria-label="Search complaints"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className={`${inputClass} w-auto`}
          data-testid="admin-complaints-status"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {["submitted", "received", "in_progress", "resolved", "closed", "reopened"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value);
            setPage(1);
          }}
          className={`${inputClass} w-auto`}
          data-testid="admin-complaints-severity"
          aria-label="Filter by severity"
        >
          <option value="">All severities</option>
          {["critical", "high", "medium", "low"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setPage(1);
          }}
          className={`${inputClass} w-auto`}
          data-testid="admin-complaints-department"
          aria-label="Filter by department"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-4 rounded border border-critical/30 bg-critical-bg px-4 py-3 text-sm text-critical">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50 text-xs uppercase tracking-wide text-slate-muted">
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Citizen report</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Ward</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-muted">Loading complaints…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8"><EmptyState title="No complaints match" body="Try different filters." /></td></tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => openDetail(r.id)}
                  className="cursor-pointer border-b border-line last:border-0 hover:bg-slate-50"
                  data-testid={`admin-complaint-row-${r.ticket_no}`}
                >
                  <td className="tnum px-4 py-3 font-semibold">{r.ticket_no}</td>
                  <td className="px-4 py-3">{r.title}</td>
                  <td className="px-4 py-3">{r.department_name}</td>
                  <td className="px-4 py-3">{r.category_name}</td>
                  <td className="px-4 py-3">{r.ward_name}</td>
                  <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                  <td className="px-4 py-3"><SeverityBadge severity={r.severity} /></td>
                  <td className="px-4 py-3 text-slate-muted">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} data-testid="admin-complaints-prev">← Previous</Button>
        <span className="text-sm text-slate-muted">Page {page} · {total} complaints</span>
        <Button variant="secondary" disabled={rows.length < 20 || loading} onClick={() => setPage((p) => p + 1)} data-testid="admin-complaints-next">Next →</Button>
      </div>

      <Drawer
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={detail ? `Complaint ${detail.complaint.ticket_no} (read-only)` : "Complaint"}
        testId="admin-complaint-drawer"
      >
        {detailLoading && <p className="text-sm text-slate-muted">Loading…</p>}
        {detail && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap gap-2">
              <StatusPill status={detail.complaint.status} />
              <SeverityBadge severity={detail.complaint.severity} />
            </div>
            <div>
              <h3 className="font-semibold">{detail.complaint.title}</h3>
              <p className="mt-1 text-slate-muted">{detail.complaint.description}</p>
              <dl className="mt-3 space-y-1">
                <div className="flex justify-between gap-4"><dt className="text-slate-muted">Department</dt><dd>{detail.complaint.department_name}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-muted">Category</dt><dd>{detail.complaint.category_name}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-muted">Ward</dt><dd>{detail.complaint.ward_name}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-muted">Address</dt><dd>{detail.complaint.address ?? "—"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-muted">Submitted</dt><dd>{new Date(detail.complaint.created_at).toLocaleString("en-IN")}</dd></div>
                {detail.complaint.resolved_at && (
                  <div className="flex justify-between gap-4"><dt className="text-slate-muted">Resolved</dt><dd>{new Date(detail.complaint.resolved_at).toLocaleString("en-IN")}</dd></div>
                )}
              </dl>
            </div>
            {detail.complaint.ai_reason && (
              <section>
                <h4 className="font-semibold">AI suggestion & citizen confirmation</h4>
                <p className="mt-1 text-slate-muted">{detail.complaint.ai_reason}</p>
                <p className="mt-1 text-xs text-slate-muted">
                  {detail.aiLog ? `Analysed by ${detail.aiLog.provider}/${detail.aiLog.model} (${detail.aiLog.source})` : ""}
                  {detail.complaint.citizen_changed_suggestion ? " · Citizen changed the suggested department." : " · Citizen confirmed the suggestion."}
                </p>
              </section>
            )}
            {detail.transfers.length > 0 && (
              <section>
                <h4 className="font-semibold">Transfers</h4>
                <ul className="mt-1 space-y-1 text-slate-muted">
                  {detail.transfers.map((t) => (
                    <li key={t.id}>
                      Moved on suspension · {new Date(t.created_at).toLocaleDateString("en-IN")} · {t.reason}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <h4 className="font-semibold">Timeline</h4>
              <ul className="mt-2 space-y-2">
                {detail.events.map((e) => (
                  <li key={e.id} className="border-l-2 border-line pl-3">
                    <p className="font-medium">{e.event.replace(/_/g, " ")}</p>
                    <p className="text-xs text-slate-muted">{new Date(e.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
                  </li>
                ))}
              </ul>
            </section>
            {detail.complaint.resolution_note && (
              <section>
                <h4 className="font-semibold">Resolution note</h4>
                <p className="mt-1 text-slate-muted">{detail.complaint.resolution_note}</p>
              </section>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
