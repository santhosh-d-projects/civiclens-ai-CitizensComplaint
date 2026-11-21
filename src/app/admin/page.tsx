// Admin dashboard — real counts only. Server component; charts are a
// client component (recharts) fed with the same data.
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusPill, EmptyState, StatCard, PageHeader, GlassCard } from "@/components/ui";
import AdminCharts from "./AdminCharts";

export default async function AdminDashboard() {
  const admin = createAdminClient();
  const [complaintsRes, deptsRes, auditRes] = await Promise.all([
    admin.from("complaints").select("id,status,severity,department_id,created_at,ticket_no,title"),
    admin.from("departments").select("id,name,status"),
    admin
      .from("audit_log")
      .select("seq,ts,actor_role,action,entity_type,entity_id,old_status,new_status,reason")
      .order("seq", { ascending: false })
      .limit(8),
  ]);
  const complaints = complaintsRes.data ?? [];
  const departments = deptsRes.data ?? [];
  const deptName = new Map(departments.map((d) => [d.id, d.name]));
  const open = complaints.filter(
    (c) => c.status !== "resolved" && c.status !== "closed",
  ).length;
  const resolved = complaints.filter((c) => c.status === "resolved").length;
  const pending = departments.filter((d) => d.status === "pending").length;
  const changes = departments.filter((d) => d.status === "changes_requested").length;
  const active = departments.filter((d) => d.status === "active").length;
  const suspended = departments.filter((d) => d.status === "suspended").length;
  const byStatus: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byDepartment: { name: string; count: number }[] = [];
  const deptCounts = new Map<string, number>();
  for (const c of complaints) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    bySeverity[c.severity] = (bySeverity[c.severity] ?? 0) + 1;
    deptCounts.set(c.department_id, (deptCounts.get(c.department_id) ?? 0) + 1);
  }
  for (const [id, count] of deptCounts) {
    byDepartment.push({ name: deptName.get(id) ?? "Unknown", count });
  }
  byDepartment.sort((a, b) => b.count - a.count);

  return (
    <div>
      <PageHeader
        eyebrow="Admin console"
        title="Admin overview"
        sub="City-wide complaints and department approvals. Admins monitor — they never route individual complaints."
        actions={
          <Link
            href="/admin/departments/new"
            data-testid="admin-new-department"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-gradient-to-r from-indigo to-violet px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(5,150,105,0.35)] transition-all hover:-translate-y-px hover:shadow-[0_12px_28px_rgba(5,150,105,0.45)]"
          >
            + New department
          </Link>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total complaints" value={String(complaints.length)} tone="indigo" testId="kpi-total-complaints" />
        <StatCard label="Open complaints" value={String(open)} sub={`${resolved} resolved`} tone="amber" testId="kpi-open-complaints" />
        <StatCard label="Pending applications" value={String(pending)} sub={`${changes} changes requested`} tone="violet" testId="kpi-pending-apps" />
        <StatCard label="Departments" value={`${active} active`} sub={`${suspended} suspended · ${departments.length} total`} tone="teal" testId="kpi-departments" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <AdminCharts byStatus={byStatus} bySeverity={bySeverity} byDepartment={byDepartment} />
      </div>

      <GlassCard className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line bg-white/50 px-5 py-4">
          <h2 className="text-base font-bold">Recent audit events</h2>
          <Link href="/admin/audit" data-testid="admin-view-audit" className="text-sm font-bold text-indigo hover:text-violet">
            View audit log →
          </Link>
        </div>
        {(auditRes.data ?? []).length === 0 ? (
          <div className="p-5">
            <EmptyState title="No audit events yet" body="Actions taken in the portal will appear here." />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {(auditRes.data ?? []).map((e) => (
              <li key={e.seq} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="tnum text-xs text-slate-muted">
                  #{e.seq} · {new Date(e.ts).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </span>
                <span className="font-semibold">{e.action}</span>
                {e.old_status && e.new_status && (
                  <>
                    <StatusPill status={e.old_status} />
                    <span aria-hidden>→</span>
                    <StatusPill status={e.new_status} />
                  </>
                )}
                <span className="text-slate-muted">{e.reason ?? ""}</span>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
