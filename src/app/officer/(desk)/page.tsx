// Officer dashboard — counts + SLA-at-risk + recent queue preview, all for
// the officer's own (active) department. Real data only; empty states when
// there is nothing.
import Link from "next/link";
import { requireActiveDepartment } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SeverityBadge, StatusPill, EmptyState } from "@/components/ui";
import { slaLabel, formatDateTime } from "@/app/officer/format";
import type { Complaint, ComplaintStatus } from "@/lib/database.types";

const OPEN: ComplaintStatus[] = ["submitted", "received", "in_progress", "reopened"];

export default async function OfficerDashboard() {
  const { session, departmentId } = await requireActiveDepartment();
  const admin = createAdminClient();

  const { data: dept } = await admin
    .from("departments")
    .select("name")
    .eq("id", departmentId)
    .single();
  const deptName = (dept as { name: string } | null)?.name ?? "Your department";

  const countQuery = () =>
    admin
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .eq("department_id", departmentId);
  const [{ count: openCount }, { count: inProgressCount }, { count: resolvedCount }, { count: overdueCount }] =
    await Promise.all([
      countQuery().in("status", OPEN),
      countQuery().eq("status", "in_progress"),
      countQuery().eq("status", "resolved"),
      countQuery()
        .in("status", OPEN)
        .lt("sla_due_at", new Date().toISOString()),
    ]);

  const { data: recent } = await admin
    .from("complaints")
    .select("id,ticket_no,title,severity,status,sla_due_at,created_at,ward_id")
    .eq("department_id", departmentId)
    .order("created_at", { ascending: false })
    .limit(5);
  const rows = (recent ?? []) as Pick<
    Complaint,
    "id" | "ticket_no" | "title" | "severity" | "status" | "sla_due_at" | "created_at" | "ward_id"
  >[];

  const wards = new Map<number, string>();
  if (rows.length > 0) {
    const { data: w } = await admin.from("wards").select("id,name");
    ((w ?? []) as { id: number; name: string }[]).forEach((x) => wards.set(x.id, x.name));
  }

  const cards = [
    { label: "Open complaints", value: openCount ?? 0, testId: "kpi-open" },
    { label: "In progress", value: inProgressCount ?? 0, testId: "kpi-in-progress" },
    { label: "Resolved", value: resolvedCount ?? 0, testId: "kpi-resolved" },
    { label: "SLA overdue", value: overdueCount ?? 0, testId: "kpi-overdue" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Department Officer Desk</h1>
      <p className="mt-1 text-sm text-slate-muted">
        {deptName} · {session.profile.full_name ?? session.email}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-line bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-muted">{c.label}</p>
            <p className="tnum mt-1 text-3xl font-semibold" data-testid={c.testId}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Latest complaints</h2>
        <Link
          href="/officer/complaints"
          data-testid="dashboard-view-queue"
          className="text-sm font-semibold text-teal hover:underline"
        >
          View full queue →
        </Link>
      </div>
      <div className="mt-3">
        {rows.length === 0 ? (
          <EmptyState
            title="No complaints yet"
            body="Complaints citizens confirm for your department will appear here."
          />
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-white">
            {rows.map((c) => {
              const sla = slaLabel(c.sla_due_at);
              return (
                <li key={c.id}>
                  <Link
                    href={`/officer/complaints/${c.id}`}
                    data-testid={`dashboard-complaint-${c.ticket_no}`}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50"
                  >
                    <span className="tnum text-sm font-semibold">{c.ticket_no}</span>
                    <SeverityBadge severity={c.severity} />
                    <StatusPill status={c.status} />
                    <span className="min-w-0 flex-1 truncate text-sm">{c.title}</span>
                    <span className="text-xs text-slate-muted">
                      {c.ward_id ? wards.get(c.ward_id) ?? "" : ""}
                    </span>
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
        )}
      </div>
    </div>
  );
}
